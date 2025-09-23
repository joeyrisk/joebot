// dump-schemas.mjs
import fs from "node:fs/promises";
import NotionPkg from "@notionhq/client";
const { Client } = NotionPkg;

const NOTION_TOKEN = process.env.NOTION_TOKEN; // set in step 3
const NOTION_VERSION = process.env.NOTION_VERSION || "2022-06-28";

if (!NOTION_TOKEN) {
  throw new Error("❌ Missing NOTION_TOKEN. In PowerShell:  $env:NOTION_TOKEN=\"secret_xxx\"");
}

const notion = new Client({ auth: NOTION_TOKEN, notionVersion: NOTION_VERSION });

async function searchAllDatabases() {
  const results = [];
  let cursor = undefined;
  do {
    const res = await notion.search({
      filter: { value: "database", property: "object" },
      page_size: 100,
      start_cursor: cursor,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return results;
}

function dbTitle(db) {
  try {
    return db.title?.[0]?.plain_text || "Untitled";
  } catch {
    return "Untitled";
  }
}

async function dumpDatabaseSchema(database_id, safeNameHint = "") {
  const db = await notion.databases.retrieve({ database_id });
  const name = safeNameHint || dbTitle(db);
  const safe = name.replace(/[^\w\-]+/g, "_");
  await fs.writeFile(
    `schema-${safe}-${database_id}.json`,
    JSON.stringify(db, null, 2),
    "utf-8"
  );
  console.log(`✅ Wrote schema-${safe}-${database_id}.json`);
}

(async () => {
  console.log("🔎 Discovering databases via Notion Search…");
  const all = await searchAllDatabases();
  for (const db of all) {
    await dumpDatabaseSchema(db.id, dbTitle(db));
  }
  console.log("🎉 Done.");
})();
