import fs from "fs";
import path from "path";
import { writeCache } from "./kv";

/**
 * Migration script to move data from aca-cache.json to Vercel Blob
 * Run this once after setting up your Blob store
 */
export async function migrateToBlob() {
  try {
    const cachePath = path.join(process.cwd(), "public", "aca-cache.json");
    
    if (!fs.existsSync(cachePath)) {
      console.log("No cache file found at:", cachePath);
      return false;
    }

    console.log("Reading cache file...");
    const raw = fs.readFileSync(cachePath, "utf8");
    const data = JSON.parse(raw);

    console.log("Migrating data to Vercel Blob...");
    const success = await writeCache(data);

    if (success) {
      console.log("✅ Migration successful! Data is now in Vercel Blob");
      return true;
    } else {
      console.log("❌ Migration failed");
      return false;
    }
  } catch (error) {
    console.error("Migration error:", error);
    return false;
  }
}

// Uncomment the line below to run migration when this file is executed
// migrateToBlob();
