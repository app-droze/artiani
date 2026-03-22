import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "products";
const ENV_PATH = path.resolve(process.cwd(), ".env.local");
const LIST_PAGE_SIZE = 1000;
const RENAME_FROM = "pillow-shepherd-anique-olive-main.jpeg";
const RENAME_TO = "pillow-shepherd-antique-olive-main.jpeg";

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

const isPillowDetailFile = (name) => {
  const normalized = name.toLowerCase();
  return normalized.startsWith("pillow-") && normalized.includes("-detail.");
};

const isPillowDuplicateFile = (name) => {
  const normalized = name.toLowerCase();
  return normalized.startsWith("pillow-") && normalized.includes(" (1).");
};

const listBucketObjects = async (storage) => {
  const objects = [];
  let offset = 0;

  while (true) {
    const { data, error } = await storage.list("", {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      throw new Error(`Failed to list bucket objects: ${error.message}`);
    }

    const page = data ?? [];
    objects.push(...page);

    if (page.length < LIST_PAGE_SIZE) {
      break;
    }

    offset += LIST_PAGE_SIZE;
  }

  return objects;
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
  console.log(`[cleanup-storage] ${title} (${entries.length})`);

  if (entries.length === 0) {
    console.log("(none)");
    return;
  }

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

  console.log(`[cleanup-storage] bucket=${BUCKET} mode=${modeLabel}`);
  console.log(
    `[cleanup-storage] using env ${supabaseUrl.name} and ${supabaseAdminKey.name} from ${ENV_PATH}`,
  );

  const bucketObjects = await listBucketObjects(storage);
  const objectNames = bucketObjects
    .map((entry) => entry.name)
    .filter((name) => typeof name === "string");

  const renamePlan = objectNames.includes(RENAME_FROM)
    ? [`${RENAME_FROM} -> ${RENAME_TO}`]
    : [];
  const detailFilesToDelete = objectNames.filter(isPillowDetailFile);
  const duplicateFilesToDelete = objectNames.filter(isPillowDuplicateFile);

  printSection("rename plan", renamePlan);
  printSection("detail files to delete", detailFilesToDelete);
  printSection("duplicate (1) files to delete", duplicateFilesToDelete);

  const results = [];
  let renamed = 0;
  let deleted = 0;
  let failed = 0;

  if (renamePlan.length > 0) {
    const source = await inspectPath(storage, RENAME_FROM);
    const destination = await inspectPath(storage, RENAME_TO);

    if (source.error) {
      results.push(`FAILED  RENAME ${RENAME_FROM} -> ${RENAME_TO} (source info failed: ${source.error.message})`);
      failed += 1;
    } else if (!source.exists) {
      results.push(`FAILED  RENAME ${RENAME_FROM} -> ${RENAME_TO} (source object not found)`);
      failed += 1;
    } else if (destination.error) {
      results.push(`FAILED  RENAME ${RENAME_FROM} -> ${RENAME_TO} (destination info failed: ${destination.error.message})`);
      failed += 1;
    } else if (destination.exists) {
      results.push(`FAILED  RENAME ${RENAME_FROM} -> ${RENAME_TO} (destination already exists)`);
      failed += 1;
    } else if (dryRun) {
      results.push(`WOULD-RENAME ${RENAME_FROM} -> ${RENAME_TO}`);
    } else {
      const { error } = await storage.move(RENAME_FROM, RENAME_TO);
      if (error) {
        results.push(`FAILED  RENAME ${RENAME_FROM} -> ${RENAME_TO} (${error.message})`);
        failed += 1;
      } else {
        results.push(`RENAMED ${RENAME_FROM} -> ${RENAME_TO}`);
        renamed += 1;
      }
    }
  }

  const filesToDelete = [...detailFilesToDelete, ...duplicateFilesToDelete];

  for (const filePath of filesToDelete) {
    if (dryRun) {
      results.push(`WOULD-DELETE ${filePath}`);
      continue;
    }

    const { error } = await storage.remove([filePath]);
    if (error) {
      results.push(`FAILED  DELETE ${filePath} (${error.message})`);
      failed += 1;
      continue;
    }

    results.push(`DELETED ${filePath}`);
    deleted += 1;
  }

  for (const result of results) {
    console.log(result);
  }

  console.log(
    `[cleanup-storage] summary renamed=${renamed} deleted=${deleted} failed=${failed}`,
  );

  if (failed > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[cleanup-storage] fatal: ${message}`);
  process.exitCode = 1;
});
