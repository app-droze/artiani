import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "products";
const RENAME_MAP = [
  {
    from: "cloth-circular-bordeaux-main.jpg",
    to: "cloth-circular-antique-bordeaux-main.jpg",
  },
  {
    from: "cloth-circular-bordeaux-detail.jpg",
    to: "cloth-circular-antique-bordeaux-detail.jpg",
  },
  {
    from: "cloth-circular-forest-detail.jpg",
    to: "cloth-circular-forest-green-detail.jpg",
  },
  {
    from: "cloth-circular-olive-main.jpg",
    to: "cloth-circular-antique-olive-main.jpg",
  },
  {
    from: "cloth-circular-olive-detail.jpg",
    to: "cloth-circular-antique-olive-detail.jpg",
  },
  {
    from: "cloth-rectangular-bordeaux-detail.jpg",
    to: "cloth-rectangular-antique-bordeaux-detail.jpg",
  },
  {
    from: "cloth-rectangular-forest-detail.jpg",
    to: "cloth-rectangular-forest-green-detail.jpg",
  },
  {
    from: "cloth-rectangular-olive-detail.jpg",
    to: "cloth-rectangular-antique-olive-detail.jpg",
  },
];

const MODE_FLAGS = {
  dryRun: new Set(["--dry-run", "--dryrun"]),
  execute: new Set(["--execute", "--move", "--real"]),
};

const ENV_PATH = path.resolve(process.cwd(), ".env.local");

const parseArgs = (argv) => {
  let execute = false;

  for (const arg of argv) {
    if (MODE_FLAGS.execute.has(arg)) {
      execute = true;
      continue;
    }

    if (MODE_FLAGS.dryRun.has(arg)) {
      execute = false;
      continue;
    }
  }

  return { execute };
};

const readEnvValue = (value) => {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

const loadEnvFile = (filePath) => {
  const fileContents = fs.readFileSync(filePath, "utf8");

  for (const rawLine of fileContents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);

    if (!process.env[key]) {
      process.env[key] = readEnvValue(value);
    }
  }
};

const getRequiredEnv = (names) => {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return { name, value: value.trim() };
    }
  }

  throw new Error(`Missing required environment variable: ${names.join(" or ")}`);
};

const formatResult = ({ status, from, to, detail }) =>
  `${status.padEnd(9)} ${from} -> ${to}${detail ? ` (${detail})` : ""}`;

const inspectPath = async (storage, objectPath) => {
  const { data, error } = await storage.info(objectPath);

  if (!error) {
    return { exists: true, error: null, metadata: data };
  }

  if (error.status === 400 || error.status === 404) {
    return { exists: false, error: null, metadata: null };
  }

  return { exists: false, error, metadata: null };
};

const main = async () => {
  const { execute } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Expected env file at ${ENV_PATH}`);
  }

  loadEnvFile(ENV_PATH);

  const supabaseUrl = getRequiredEnv(["SUPABASE_URL"]);
  const supabaseAdminKey = getRequiredEnv([
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]);

  const supabase = createClient(supabaseUrl.value, supabaseAdminKey.value, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const storage = supabase.storage.from(BUCKET);
  const modeLabel = execute ? "EXECUTE" : "DRY-RUN";
  const results = [];

  console.log(`[rename-storage] bucket=${BUCKET} mode=${modeLabel}`);
  console.log(
    `[rename-storage] using env ${supabaseUrl.name} and ${supabaseAdminKey.name} from ${ENV_PATH}`,
  );

  for (const rename of RENAME_MAP) {
    const source = await inspectPath(storage, rename.from);
    if (source.error) {
      results.push(
        formatResult({
          status: "ERROR",
          from: rename.from,
          to: rename.to,
          detail: `source info failed: ${source.error.message}`,
        }),
      );
      continue;
    }

    if (!source.exists) {
      results.push(
        formatResult({
          status: "MISSING",
          from: rename.from,
          to: rename.to,
          detail: "source object not found",
        }),
      );
      continue;
    }

    const destination = await inspectPath(storage, rename.to);
    if (destination.error) {
      results.push(
        formatResult({
          status: "ERROR",
          from: rename.from,
          to: rename.to,
          detail: `destination info failed: ${destination.error.message}`,
        }),
      );
      continue;
    }

    if (destination.exists) {
      results.push(
        formatResult({
          status: "SKIP",
          from: rename.from,
          to: rename.to,
          detail: "destination already exists",
        }),
      );
      continue;
    }

    if (!execute) {
      results.push(
        formatResult({
          status: "WOULD-MOVE",
          from: rename.from,
          to: rename.to,
        }),
      );
      continue;
    }

    const { error } = await storage.move(rename.from, rename.to);
    if (error) {
      results.push(
        formatResult({
          status: "FAILED",
          from: rename.from,
          to: rename.to,
          detail: error.message,
        }),
      );
      continue;
    }

    results.push(
      formatResult({
        status: "MOVED",
        from: rename.from,
        to: rename.to,
      }),
    );
  }

  for (const result of results) {
    console.log(result);
  }

  const summary = {
    moved: results.filter((line) => line.startsWith("MOVED")).length,
    wouldMove: results.filter((line) => line.startsWith("WOULD-MOVE")).length,
    skipped: results.filter((line) => line.startsWith("SKIP")).length,
    missing: results.filter((line) => line.startsWith("MISSING")).length,
    failed: results.filter((line) => line.startsWith("FAILED") || line.startsWith("ERROR")).length,
  };

  console.log(
    `[rename-storage] summary moved=${summary.moved} would-move=${summary.wouldMove} skipped=${summary.skipped} missing=${summary.missing} failed=${summary.failed}`,
  );

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[rename-storage] fatal: ${message}`);
  process.exitCode = 1;
});
