import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const BUCKET = "products";
const ENV_PATH = path.resolve(process.cwd(), ".env.local");
const LIST_PAGE_SIZE = 1000;

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

const matchesTargetFile = (name) => {
  const normalized = name.toLowerCase();
  return normalized.startsWith("pillow-") && normalized.includes("detail");
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

  console.log(`[delete-storage] bucket=${BUCKET} mode=${modeLabel}`);
  console.log(
    `[delete-storage] using env ${supabaseUrl.name} and ${supabaseAdminKey.name} from ${ENV_PATH}`,
  );

  const bucketObjects = await listBucketObjects(storage);
  const matchedFiles = bucketObjects
    .filter((entry) => typeof entry.name === "string" && matchesTargetFile(entry.name))
    .map((entry) => entry.name);

  console.log(`[delete-storage] matched files (${matchedFiles.length})`);
  for (const filePath of matchedFiles) {
    console.log(filePath);
  }

  if (matchedFiles.length === 0) {
    console.log("[delete-storage] nothing to delete");
    return;
  }

  const results = [];

  for (const filePath of matchedFiles) {
    if (dryRun) {
      results.push(`WOULD-DELETE ${filePath}`);
      continue;
    }

    const { error } = await storage.remove([filePath]);
    if (error) {
      results.push(`FAILED       ${filePath} (${error.message})`);
      continue;
    }

    results.push(`DELETED      ${filePath}`);
  }

  for (const result of results) {
    console.log(result);
  }

  const summary = {
    deleted: results.filter((line) => line.startsWith("DELETED")).length,
    wouldDelete: results.filter((line) => line.startsWith("WOULD-DELETE")).length,
    failed: results.filter((line) => line.startsWith("FAILED")).length,
  };

  console.log(
    `[delete-storage] summary deleted=${summary.deleted} would-delete=${summary.wouldDelete} failed=${summary.failed}`,
  );

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[delete-storage] fatal: ${message}`);
  process.exitCode = 1;
});
