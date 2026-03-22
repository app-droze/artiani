import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "products";
const ENV_PATH = path.resolve(process.cwd(), ".env.local");

const RENAME_MAP = [
  {
    from: "runner-couple-bordo-detail.jpeg",
    to: "runner-couple-antique-bordeaux-detail.jpeg",
  },
  {
    from: "runner-couple-forest-detail.jpeg",
    to: "runner-couple-forest-green-detail.jpeg",
  },
  {
    from: "runner-couple-olive-detail.jpeg",
    to: "runner-couple-antique-olive-detail.jpeg",
  },
  {
    from: "runner-family-bordo-detail.jpeg",
    to: "runner-family-antique-bordeaux-detail.jpeg",
  },
  {
    from: "runner-family-fores-green-main.jpeg",
    to: "runner-family-forest-green-main.jpeg",
  },
  {
    from: "runner-family-forest-detail.jpeg",
    to: "runner-family-forest-green-detail.jpeg",
  },
  {
    from: "runner-family-olive-detail.jpeg",
    to: "runner-family-antique-olive-detail.jpeg",
  },
  {
    from: "runner-kajar-bordo-detail.jpeg",
    to: "runner-kajar-antique-bordeaux-detail.jpeg",
  },
  {
    from: "runner-kajar-forest-detail.jpeg",
    to: "runner-kajar-forest-green-detail.jpeg",
  },
  {
    from: "runner-kajar-olive-detail.jpeg",
    to: "runner-kajar-antique-olive-detail.jpeg",
  },
  {
    from: "runner-lamb-bordo-detail.jpeg",
    to: "runner-lamb-antique-bordeaux-detail.jpeg",
  },
  {
    from: "runner-lamb-forest-detail.jpeg",
    to: "runner-lamb-forest-green-detail.jpeg",
  },
  {
    from: "runner-lamb-olive-detail.jpeg",
    to: "runner-lamb-antique-olive-detail.jpeg",
  },
  {
    from: "runner-large-couple-anitque-bordeaux-main.jpeg",
    to: "runner-large-couple-antique-bordeaux-main.jpeg",
  },
  {
    from: "runner-large-couple-anitque-olive-main.jpeg",
    to: "runner-large-couple-antique-olive-main.jpeg",
  },
  {
    from: "runner-large-couple-forest-green.jpeg",
    to: "runner-large-couple-forest-green-main.jpeg",
  },
  {
    from: "runner-large-couple-bordo-detail.jpeg",
    to: "runner-large-couple-antique-bordeaux-detail.jpeg",
  },
  {
    from: "runner-large-couple-forest-detail.jpeg",
    to: "runner-large-couple-forest-green-detail.jpeg",
  },
  {
    from: "runner-large-couple-olive-detail.jpeg",
    to: "runner-large-couple-antique-olive-detail.jpeg",
  },
  {
    from: "runner-large-family-garden-bordo-detail.jpeg",
    to: "runner-large-family-garden-antique-bordeaux-detail.jpeg",
  },
  {
    from: "runner-large-family-garden-bordo-detail2.jpeg",
    to: "runner-large-family-garden-antique-bordeaux-detail2.jpeg",
  },
  {
    from: "runner-large-family-garden-forest-detail.jpeg",
    to: "runner-large-family-garden-forest-green-detail.jpeg",
  },
  {
    from: "runner-large-family-garden-forest-detail2.jpeg",
    to: "runner-large-family-garden-forest-green-detail2.jpeg",
  },
  {
    from: "runner-large-family-garden-olive-detail.jpeg",
    to: "runner-large-family-garden-antique-olive-detail.jpeg",
  },
  {
    from: "runner-large-family-garden-olive-detail2.jpeg",
    to: "runner-large-family-garden-antique-olive-detail2.jpeg",
  },
];

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

const isDryRun = () => {
  const value = process.env.DRY_RUN;

  if (typeof value !== "string") {
    return true;
  }

  return value.trim().toLowerCase() !== "false";
};

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

const printSection = (title, entries) => {
  console.log(`[rename-storage] ${title} (${entries.length})`);

  for (const entry of entries) {
    console.log(entry);
  }
};

const main = async () => {
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
  const dryRun = isDryRun();
  const modeLabel = dryRun ? "DRY-RUN" : "EXECUTE";
  const renamePlan = RENAME_MAP.map(({ from, to }) => `${from} -> ${to}`);

  console.log(`[rename-storage] bucket=${BUCKET} mode=${modeLabel}`);
  console.log(
    `[rename-storage] using env ${supabaseUrl.name} and ${supabaseAdminKey.name} from ${ENV_PATH}`,
  );
  printSection("rename plan", renamePlan);

  const results = [];
  let renamed = 0;
  let wouldRename = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;

  for (const rename of RENAME_MAP) {
    const source = await inspectPath(storage, rename.from);

    if (source.error) {
      results.push(
        `FAILED  ${rename.from} -> ${rename.to} (source info failed: ${source.error.message})`,
      );
      failed += 1;
      continue;
    }

    if (!source.exists) {
      results.push(`MISSING ${rename.from} -> ${rename.to} (source object not found)`);
      missing += 1;
      continue;
    }

    const destination = await inspectPath(storage, rename.to);

    if (destination.error) {
      results.push(
        `FAILED  ${rename.from} -> ${rename.to} (destination info failed: ${destination.error.message})`,
      );
      failed += 1;
      continue;
    }

    if (destination.exists) {
      results.push(`SKIP    ${rename.from} -> ${rename.to} (destination already exists)`);
      skipped += 1;
      continue;
    }

    if (dryRun) {
      results.push(`WOULD-RENAME ${rename.from} -> ${rename.to}`);
      wouldRename += 1;
      continue;
    }

    const { error } = await storage.move(rename.from, rename.to);

    if (error) {
      results.push(`FAILED  ${rename.from} -> ${rename.to} (${error.message})`);
      failed += 1;
      continue;
    }

    results.push(`RENAMED ${rename.from} -> ${rename.to}`);
    renamed += 1;
  }

  for (const result of results) {
    console.log(result);
  }

  console.log(
    `[rename-storage] summary renamed=${renamed} would-rename=${wouldRename} skipped=${skipped} missing=${missing} failed=${failed}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[rename-storage] fatal: ${message}`);
  process.exitCode = 1;
});
