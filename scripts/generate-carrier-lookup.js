// /scripts/generate-carrier-lookup.js
import { Client } from "@notionhq/client";
import fs from "fs";

const CARRIERS_DB_ID = process.env.NOTION_DB_CARRIERS;

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2022-06-28",
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
    const nameProp = page.properties?.Name;
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
    console.log("🔎 Fetching carriers from Notion…");
    const carriers = await fetchCarriers();
    console.log(`✅ Found ${carriers.length} carriers.`);

    const lookup = buildLookup(carriers);

    const output = `export const carrierLookup = ${JSON.stringify(
      lookup,
      null,
      2
    )};\n`;

    // ✅ Write to /lib instead of root
    fs.writeFileSync("./lib/carrierLookup.mjs", output);

    console.log("✅ lib/carrierLookup.mjs written. Example:");
    console.log(output);
  } catch (err) {
    console.error("❌ Error fetching carriers:", err.message);
  }
})();
