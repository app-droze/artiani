import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "products";
const ENV_PATH = path.resolve(process.cwd(), ".env.local");
const LOG_PREFIX = "[copy-canonical-storage-assets]";

const CANONICAL_ASSETS = [
  {
    source: "cloth-circular-antique-bordeaux-large-main.jpg",
    target: "cloth-circular-antique_bordeaux-large-main.png",
  },
  {
    source: "cloth-circular-forest-large-main.jpg",
    target: "cloth-circular-forest_green-large-main.png",
  },
  {
    source: "cloth-circular-golden-large-main.jpg",
    target: "cloth-circular-golden-large-main.png",
  },
  {
    source: "cloth-circular-horange-large-main.jpg",
    target: "cloth-circular-h_orange-large-main.png",
  },
  {
    source: "cloth-circular-navy-large-main.jpg",
    target: "cloth-circular-navy-large-main.png",
  },
  {
    source: "cloth-circular-antique-olive-large-main.jpg",
    target: "cloth-circular-antique_olive-large-main.png",
  },
  {
    source: "cloth-circular-purple-large-main.jpg",
    target: "cloth-circular-purple-large-main.png",
  },
  {
    source: "cloth-circular-sky-large-main.jpg",
    target: "cloth-circular-sky-large-main.png",
  },
  {
    source: "cloth-rectangular-antique-bordeaux-large-main.jpg",
    target: "cloth-rectangular-antique_bordeaux-large-main.png",
  },
  {
    source: "cloth-rectangular-forest-green-large-main.jpg",
    target: "cloth-rectangular-forest_green-large-main.png",
  },
  {
    source: "cloth-rectangular-golden-large-main.jpg",
    target: "cloth-rectangular-golden-large-main.png",
  },
  {
    source: "cloth-rectangular-horange-large-main.jpg",
    target: "cloth-rectangular-h_orange-large-main.png",
  },
  {
    source: "cloth-rectangular-lilac-large-main.jpg",
    target: "cloth-rectangular-lilac-large-main.png",
  },
  {
    source: "cloth-rectangular-navy-large-main.jpg",
    target: "cloth-rectangular-navy-large-main.png",
  },
  {
    source: "cloth-rectangular-antique-olive-large-main.jpg",
    target: "cloth-rectangular-antique_olive-large-main.png",
  },
  {
    source: "cloth-rectangular-purple-large-main.jpg",
    target: "cloth-rectangular-purple-large-main.png",
  },
  {
    source: "cloth-rectangular-sky-large-main.jpg",
    target: "cloth-rectangular-sky-large-main.png",
  },
  {
    source: "category-runner-card.png",
    target: "category-runners-card.png",
  },
  {
    source: "category-scarvs-card.jpg",
    target: "category-scarves-card.png",
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
  let skippedExisting = 0;
  let missingSource = 0;
  let failed = 0;

  for (const asset of CANONICAL_ASSETS) {
    if (existingNames.has(asset.target)) {
      console.log(`SKIP    target exists ${asset.source} -> ${asset.target}`);
      skippedExisting += 1;
      continue;
    }

    if (!existingNames.has(asset.source)) {
      console.log(`MISSING source ${asset.source} -> ${asset.target}`);
      missingSource += 1;
      continue;
    }

    if (dryRun) {
      console.log(`WOULD   copy ${asset.source} -> ${asset.target}`);
      continue;
    }

    const { error } = await storage.copy(asset.source, asset.target);
    if (error) {
      console.log(`FAILED  copy ${asset.source} -> ${asset.target} (${error.message})`);
      failed += 1;
      continue;
    }

    existingNames.add(asset.target);
    console.log(`COPIED  ${asset.source} -> ${asset.target}`);
    copied += 1;
  }

  console.log(
    `${LOG_PREFIX} summary copied=${copied} skippedExisting=${skippedExisting} missingSource=${missingSource} failed=${failed}`,
  );

  if (failed > 0 || missingSource > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  console.error(`${LOG_PREFIX} unexpected failure`, error);
  process.exitCode = 1;
});
