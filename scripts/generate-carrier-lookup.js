// /scripts/generate-carrier-lookup.js
import { Client } from "@notionhq/client";
import fs from "fs";
import { notionDbMap } from "../lib/notionDbMap.mjs";

const CARRIERS_DATA_SOURCE_ID = notionDbMap.carriers.dataSourceId;

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2025-09-03", // consistent with your notion-query.js
});

async function fetchCarriers() {
  let results = [];
  let cursor = undefined;

  do {
    const response = await notion.request({
      path: `data_sources/${CARRIERS_DATA_SOURCE_ID}/query`,
      method: "POST",
      body: cursor ? { start_cursor: cursor } : {}
    });

    results = results.concat(response.results || []);
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
    console.log("🔎 Fetching carriers from Notion (via data source)...");
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
