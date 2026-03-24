import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "products";
const ENV_PATH = path.resolve(process.cwd(), ".env.local");
const LOG_PREFIX = "[normalize-rectangular-cloth-jpgs]";

const RECTANGULAR_JPG_TARGETS = [
  {
    target: "cloth-rectangular-antique_bordeaux-large-main.jpg",
    sourceCandidates: [
      "cloth-rectangular-antique-bordeaux-large-main.jpg",
    ],
  },
  {
    target: "cloth-rectangular-forest_green-large-main.jpg",
    sourceCandidates: [
      "cloth-rectangular-forest-green-large-main.jpg",
    ],
  },
  {
    target: "cloth-rectangular-golden-large-main.jpg",
    sourceCandidates: [
      "cloth-rectangular-golden-large-main.jpg",
    ],
  },
  {
    target: "cloth-rectangular-h_orange-large-main.jpg",
    sourceCandidates: [
      "cloth-rectangular-horange-large-main.jpg",
    ],
  },
  {
    target: "cloth-rectangular-lilac-large-main.jpg",
    sourceCandidates: [
      "cloth-rectangular-lilac-large-main.jpg",
    ],
  },
  {
    target: "cloth-rectangular-navy-large-main.jpg",
    sourceCandidates: [
      "cloth-rectangular-navy-large-main.jpg",
    ],
  },
  {
    target: "cloth-rectangular-antique_olive-large-main.jpg",
    sourceCandidates: [
      "cloth-rectangular-antique-olive-large-main.jpg",
    ],
  },
  {
    target: "cloth-rectangular-purple-large-main.jpg",
    sourceCandidates: [
      "cloth-rectangular-purple-large-main.jpg",
    ],
  },
  {
    target: "cloth-rectangular-sky-large-main.jpg",
    sourceCandidates: [
      "cloth-rectangular-sky-large-main.jpg",
    ],
  },
];

const RECTANGULAR_PNG_TARGETS = [
  "cloth-rectangular-antique_bordeaux-large-main.png",
  "cloth-rectangular-antique_olive-large-main.png",
  "cloth-rectangular-forest_green-large-main.png",
  "cloth-rectangular-golden-large-main.png",
  "cloth-rectangular-h_orange-large-main.png",
  "cloth-rectangular-lilac-large-main.png",
  "cloth-rectangular-navy-large-main.png",
  "cloth-rectangular-purple-large-main.png",
  "cloth-rectangular-sky-large-main.png",
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

const listAllObjectNames = async (storage) => {
  const names = new Set();
  let offset = 0;

  while (true) {
    const { data, error } = await storage.list("", {
      limit: 100,
      offset,
      sortBy: {
        column: "name",
        order: "asc",
      },
    });

    if (error) {
      throw error;
    }

    const page = data ?? [];
    for (const item of page) {
      if (item.name) {
        names.add(item.name);
      }
    }

    if (page.length < 100) {
      break;
    }

    offset += page.length;
  }

  return names;
};

const main = async () => {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`Expected env file at ${ENV_PATH}`);
  }

  loadEnvFile(ENV_PATH);

  const supabaseUrl = getRequiredEnv(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);
  const supabaseAdminKey = getRequiredEnv(["SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"]);

  const supabase = createClient(supabaseUrl.value, supabaseAdminKey.value, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  const storage = supabase.storage.from(BUCKET);
  const dryRun = isDryRun();
  const existingNames = await listAllObjectNames(storage);

  console.log(`${LOG_PREFIX} bucket=${BUCKET} mode=${dryRun ? "DRY-RUN" : "EXECUTE"}`);
  console.log(
    `${LOG_PREFIX} using env ${supabaseUrl.name} and ${supabaseAdminKey.name} from ${ENV_PATH}`,
  );

  let copied = 0;
  let copySkipped = 0;
  let copyMissing = 0;
  let deleteSkipped = 0;
  let deleted = 0;
  let failed = 0;

  for (const asset of RECTANGULAR_JPG_TARGETS) {
    if (existingNames.has(asset.target)) {
      console.log(`SKIP    target exists ${asset.target}`);
      copySkipped += 1;
      continue;
    }

    const source = asset.sourceCandidates.find((candidate) => existingNames.has(candidate));

    if (!source) {
      console.log(
        `MISSING source for ${asset.target} (tried: ${asset.sourceCandidates.join(", ")})`,
      );
      copyMissing += 1;
      continue;
    }

    if (dryRun) {
      console.log(`WOULD   copy ${source} -> ${asset.target}`);
      continue;
    }

    const { error } = await storage.copy(source, asset.target);

    if (error) {
      console.log(`FAILED  copy ${source} -> ${asset.target} (${error.message})`);
      failed += 1;
      continue;
    }

    existingNames.add(asset.target);
    console.log(`COPIED  ${source} -> ${asset.target}`);
    copied += 1;
  }

  const missingCanonicalJpgs = RECTANGULAR_JPG_TARGETS
    .map((asset) => asset.target)
    .filter((target) => !existingNames.has(target));

  if (missingCanonicalJpgs.length > 0) {
    console.log(
      `${LOG_PREFIX} skip png delete; missing canonical jpgs: ${missingCanonicalJpgs.join(", ")}`,
    );
  } else {
    for (const pngPath of RECTANGULAR_PNG_TARGETS) {
      if (!existingNames.has(pngPath)) {
        console.log(`SKIP    png missing ${pngPath}`);
        deleteSkipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(`WOULD   delete ${pngPath}`);
        continue;
      }

      const { error } = await storage.remove([pngPath]);

      if (error) {
        console.log(`FAILED  delete ${pngPath} (${error.message})`);
        failed += 1;
        continue;
      }

      existingNames.delete(pngPath);
      console.log(`DELETED ${pngPath}`);
      deleted += 1;
    }
  }

  console.log(
    `${LOG_PREFIX} summary copied=${copied} copySkipped=${copySkipped} copyMissing=${copyMissing} deleted=${deleted} deleteSkipped=${deleteSkipped} failed=${failed}`,
  );

  if (failed > 0 || copyMissing > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(`${LOG_PREFIX} unexpected failure`, error);
  process.exitCode = 1;
});
