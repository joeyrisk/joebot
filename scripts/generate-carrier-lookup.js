// /scripts/generate-carrier-lookup.js
import "dotenv/config";
import { Client } from "@notionhq/client";
import fs from "fs";
import { execSync } from "child_process";
import { notionDbMap } from "../lib/notionDbMap.mjs";

// ✅ Use the databaseId (not the dataSourceId)
const CARRIERS_DB_ID = notionDbMap.carriers.databaseId;

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2022-06-28", // stable version
});

async function fetchCarriers() {
  let results = [];
  let cursor = undefined;

  do {
    const response = await notion.databases.query({
      database_id: CARRIERS_DB_ID,
      start_cursor: cursor,
    });

    results = results.concat(response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return results;
}

function buildLookup(carriers) {
  const lookup = {};
  carriers.forEach((page) => {
    const props = page.properties || {};
    const nameProp = props?.Name;

    const name =
      nameProp?.title?.[0]?.plain_text?.trim() ||
      nameProp?.rich_text?.[0]?.plain_text?.trim();

    if (name) {
      lookup[name] = page.id;
    }
  });
  return lookup;
}

(async () => {
  try {
    console.log("🔎 Fetching carriers from Notion (via databaseId)...");
    const carriers = await fetchCarriers();
    console.log(`✅ Found ${carriers.length} carriers.`);

    const lookup = buildLookup(carriers);

    const output = `export const carrierLookup = ${JSON.stringify(
      lookup,
      null,
      2
    )};\n`;

    const filePath = "./lib/carrierLookup.mjs";
    fs.writeFileSync(filePath, output);

    console.log("✅ lib/carrierLookup.mjs written. Example:");
    console.log(output.slice(0, 500) + "...");

    // 🔥 Auto-commit + push
    try {
      execSync(`git add ${filePath}`);
      execSync(
        `git commit -m "chore: update carrierLookup.mjs (${carriers.length} carriers)" || echo "No changes to commit"`
      );
      execSync(`git push origin main`);
      console.log("🚀 carrierLookup.mjs committed & pushed to main.");
    } catch (gitErr) {
      console.warn("⚠️ Git commit/push skipped:", gitErr.message);
    }
  } catch (err) {
    console.error("❌ Error fetching carriers:", err.message);
    console.log("⚠️ Using last committed carrierLookup.mjs as fallback.");
  }
})();
