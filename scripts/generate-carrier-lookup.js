// generate-carrier-lookup.js
import { Client } from "@notionhq/client";
import fs from "fs";

// ✅ Replace with your Carrier DB ID (the "Carriers, Brokers and Vendors" DB)
const CARRIERS_DB_ID = process.env.NOTION_DB_CARRIERS;

// ✅ Init client
const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2022-06-28", // stable version works fine for DB queries
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
      lookup[name] = page.id; // page.id is the UUID Notion expects
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

    // Write to file for copy-paste
    const output = `export const carrierLookup = ${JSON.stringify(
      lookup,
      null,
      2
    )};\n`;

    fs.writeFileSync("carrierLookup.mjs", output);

    console.log("✅ carrierLookup.mjs written. Example:");
    console.log(output);
  } catch (err) {
    console.error("❌ Error fetching carriers:", err.message);
  }
})();
