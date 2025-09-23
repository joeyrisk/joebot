// /scripts/generate-carrier-lookup.js
import { Client } from "@notionhq/client";
import fs from "fs";
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

    fs.writeFileSync("./lib/carrierLookup.mjs", output);

    console.log("✅ lib/carrierLookup.mjs written. Example:");
    console.log(output);
  } catch (err) {
    console.error("❌ Error fetching carriers:", err.message);
  }
})();
