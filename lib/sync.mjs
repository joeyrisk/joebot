// lib/sync.mjs
import OpenAI, { toFile } from "openai";
import NotionPkg from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";

const { Client } = NotionPkg;

// ---- env ----
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID = process.env.NOTION_CARRIERS_DB_ID;
const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID;

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!NOTION_TOKEN) throw new Error("Missing NOTION_TOKEN");
if (!DB_ID) throw new Error("Missing NOTION_CARRIERS_DB_ID");
if (!VECTOR_STORE_ID) throw new Error("Missing VECTOR_STORE_ID");

// ---- clients ----
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const notion = new Client({ auth: NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

// ---- helpers ----
function chunkText(str, approxTokens = 1000) {
  const maxChars = approxTokens * 4; // ~4 chars per token
  const chunks = [];
  for (let i = 0; i < str.length; i += maxChars) {
    chunks.push(str.slice(i, i + maxChars));
  }
  return chunks;
}

function fm(meta) {
  return `---
carrier: ${meta.carrier ?? ""}
section: ${meta.section ?? ""}
last_verified: ${meta.last_verified ?? ""}
notion_url: ${meta.url ?? ""}
---

`;
}

async function fetchAllIncludedPages() {
  const results = [];
  let cursor;

  const db = await notion.databases.retrieve({ database_id: DB_ID });
  const propNames = Object.keys(db.properties || {});
  const includeProp = propNames.find((p) => p.toLowerCase() === "include in gpt");

  let filter = undefined;
  if (includeProp) {
    filter = { property: includeProp, checkbox: { equals: true } };
  }

  do {
    const res = await notion.databases.query({
      database_id: DB_ID,
      ...(filter ? { filter } : {}),
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return results;
}

function getTitle(page) {
  const titleProp = Object.values(page.properties).find((p) => p.type === "title");
  const text = titleProp?.title?.map((t) => t.plain_text).join("") ?? "";
  return text || "Untitled";
}

function getPropText(page, propName) {
  const p = page.properties[propName];
  if (!p) return "";
  if (p.type === "rich_text") return p.rich_text.map((t) => t.plain_text).join("");
  if (p.type === "url") return p.url ?? "";
  if (p.type === "date") return p.date?.start ?? "";
  if (p.type === "select") return p.select?.name ?? "";
  if (p.type === "multi_select") return p.multi_select.map((s) => s.name).join(", ");
  if (p.type === "checkbox") return p.checkbox ? "true" : "false";
  if (p.type === "number") return String(p.number ?? "");
  return "";
}

async function pageToMarkdown(pageId) {
  const blocks = await n2m.pageToMarkdown(pageId);
  const md = n2m.toMarkdownString(blocks);
  return md.parent || "";
}

async function deleteAllVectorStoreFiles() {
  let cursor;
  do {
    const list = await openai.vectorStores.files.list(VECTOR_STORE_ID, { after: cursor });
    for (const f of list.data) {
      try {
        await openai.vectorStores.files.del(VECTOR_STORE_ID, f.id);
      } catch (err) {
        console.warn(`Failed to delete vector store file ${f.id}:`, err.message);
      }

      try {
        await openai.files.del(f.id);
      } catch (err) {
        console.warn(`Failed to delete OpenAI file ${f.id}:`, err.message);
      }
    }
    cursor = list.has_more ? list.last_id : undefined;
  } while (cursor);
}

async function uploadText(text, filename) {
  const file = await openai.files.create({
    file: await toFile(Buffer.from(text, "utf-8"), filename, { type: "text/markdown" }),
    purpose: "assistants",
  });
  await openai.vectorStores.files.create(VECTOR_STORE_ID, { file_id: file.id });
  return file.id;
}

export async function runSync() {
  await deleteAllVectorStoreFiles();
  const pages = await fetchAllIncludedPages();

for (const page of pages) {
  const title = getTitle(page);
  console.log(`📄 Syncing Notion page: ${title}`);

  const md = await pageToMarkdown(page.id);
  const header = fm({
    carrier: title,
    section: "Carrier Page",
    last_verified: getPropText(page, "Last Verified") || "",
    url: page.url,
  });

  const chunks = chunkText(header + md, 1000);

  if (!chunks.length) {
    console.warn(`⚠️ Skipped empty content for: ${title}`);
    continue;
  }

  let idx = 1;
  for (const ch of chunks) {
    const safe = title.replace(/[^\w\-]+/g, "_");
    await uploadText(ch, `${safe}-${idx}.md`);
    idx++;
  }
}

return {
  ok: true,
  pages: pages.length,
  titles: pages.map(getTitle)
};
}; // ✅ This closes runSync

