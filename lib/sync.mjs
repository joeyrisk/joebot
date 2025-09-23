// lib/sync.mjs
import OpenAI, { toFile } from "openai";
import NotionPkg from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import { SECTIONS } from "./sections.config.mjs";

const { Client } = NotionPkg;

/* ----------------------- ENV ----------------------- */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID = process.env.NOTION_CARRIERS_DB_ID; // "Carriers, Brokers and Partners (New)"
const VECTOR_STORE_ID = process.env.VECTOR_STORE_ID;

if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
if (!NOTION_TOKEN) throw new Error("Missing NOTION_TOKEN");
if (!DB_ID) throw new Error("Missing NOTION_CARRIERS_DB_ID");
if (!VECTOR_STORE_ID) throw new Error("Missing VECTOR_STORE_ID");

/* --------------------- CLIENTS --------------------- */
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const notion = new Client({ auth: NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

/* --------------------- HELPERS --------------------- */
function chunkText(str, approxTokens = 1000) {
  const maxChars = approxTokens * 4; // ~4 chars/token
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

// Exported so you can use it from a /api/sync-list route if you want
export async function fetchAllIncludedPages() {
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

/* --------------- SECTION-SPECIFIC HELPERS --------------- */
function asPercent(n) {
  if (n === null || n === undefined || n === "") return "";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  // 0.12 -> "12%", 0.005 -> "0.50%"
  return `${(num * 100).toFixed(num < 0.01 ? 2 : 0)}%`;
}

function relationContains(pageId, propName) {
  return { property: propName, relation: { contains: pageId } };
}

async function querySectionRows({ databaseId, carrierRelationProp, carrierPageId, extraFilter, sort }) {
  const baseFilter = relationContains(carrierPageId, carrierRelationProp);
  const filter = extraFilter ? { and: [baseFilter, extraFilter] } : baseFilter;
  const sorts = (sort || []).map((s) => ({ property: s.property, direction: s.direction }));

  const rows = [];
  let cursor;
  do {
    const res = await notion.databases.query({
      database_id: databaseId,
      filter,
      sorts,
      start_cursor: cursor,
      page_size: 100,
    });
    rows.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return rows;
}

function formatCell(val) {
  switch (val.type) {
    case "title":
      return (val.title || []).map((t) => t.plain_text).join("");
    case "rich_text":
      return (val.rich_text || []).map((t) => t.plain_text).join("");
    case "select":
      return val.select?.name || "";
    case "multi_select":
      return (val.multi_select || []).map((s) => s.name).join(", ");
    case "people":
      return (val.people || []).map((p) => p.name || p.id).join(", ");
    case "email":
      return val.email || "";
    case "phone_number":
      return val.phone_number || "";
    case "url":
      return val.url || "";
    case "number":
      return (val.number ?? "") + "";
    case "checkbox":
      return val.checkbox ? "true" : "false";
    case "date": {
      const s = val.date?.start || "";
      const e = val.date?.end || "";
      return e ? `${s} → ${e}` : s;
    }
    case "files": {
      const urls = (val.files || [])
        .map((f) => f.external?.url || f.file?.url || "")
        .filter(Boolean);
      return urls.join(", ");
    }
    case "relation":
      return (val.relation || []).map((r) => r.id).join(", "); // could hydrate titles later
    case "rollup": {
      const rt = val.rollup?.type;
      if (rt === "number") return (val.rollup.number ?? "") + "";
      if (rt === "date") return val.rollup.date?.start || "";
      if (rt === "array")
        return (val.rollup.array || [])
          .map((item) => {
            const k = Object.keys(item || {})[0];
            const v = item?.[k];
            return typeof v === "object" && v?.type === "title"
              ? (v.title || []).map((t) => t.plain_text).join("")
              : typeof v === "object" && v?.type
              ? formatCell(v)
              : JSON.stringify(v ?? "");
          })
          .join("; ");
      if (rt === "string") return val.rollup.string || "";
      return "";
    }
    case "formula": {
      const f = val.formula;
      if (!f) return "";
      if (f.type === "string") return f.string || "";
      if (f.type === "number") return (f.number ?? "") + "";
      if (f.type === "boolean") return f.boolean ? "true" : "false";
      if (f.type === "date") return f.date?.start || "";
      return "";
    }
    default:
      return "";
  }
}

function extractRowCells(row, columns) {
  const props = row.properties || {};
  const out = {};
  for (const col of columns) {
    const val = props[col];
    out[col] = val ? formatCell(val) : "";
  }
  out.__notion_id = row.id;
  out.__notion_url = row.url || `https://www.notion.so/${row.id.replace(/-/g, "")}`;
  return out;
}

function renderMarkdownTable(sectionTitle, columns, rows) {
  if (!rows.length) return `## ${sectionTitle}\n\n_No rows_\n`;
  const header = `| ${columns.join(" | ")} |\n| ${columns.map(() => "---").join(" | ")} |`;
  const lines = rows.map(
    (r) => `| ${columns.map((c) => String(r[c] ?? "").replace(/\n/g, " ")).join(" | ")} |`
  );
  return `## ${sectionTitle}\n\n${header}\n${lines.join("\n")}\n`;
}

// optional: warn if a column name doesn't exist in the DB
async function verifyColumnsExist(databaseId, wanted) {
  try {
    const db = await notion.databases.retrieve({ database_id: databaseId });
    const available = new Set(Object.keys(db.properties || {}));
    const missing = wanted.filter((c) => !available.has(c));
    if (missing.length) {
      console.warn(`⚠️ Missing columns in DB ${databaseId}: ${missing.join(", ")}`);
    }
  } catch (e) {
    console.warn(`⚠️ Could not verify columns for DB ${databaseId}: ${e.message}`);
  }
}

/* ------------------------ MAIN ------------------------ */
/**
 * runSync({ limit, offset, reset })
 * - limit: number of carriers to process this run (default 5)
 * - offset: starting index in the carriers list (default 0)
 * - reset: if true, clears vector store before processing (default false)
 */
export async function runSync(opts = {}) {
  const { limit = 5, offset = 0, reset = false } = opts;

  if (reset) {
    console.log("🧹 Reset=true → deleting all files from vector store…");
    await deleteAllVectorStoreFiles();
  }

  const pages = await fetchAllIncludedPages();
  const slice = pages.slice(offset, offset + limit);

  for (const page of slice) {
    const title = getTitle(page);
    console.log(`📄 Syncing Notion page: ${title}`);

    let md = await pageToMarkdown(page.id);

    // Append DB-backed sections scoped to THIS carrier
    for (const sec of SECTIONS) {
      try {
        console.log(`🔎 Section start: ${sec.section} for carrier ${title}`);
        await verifyColumnsExist(sec.databaseId, sec.columns); // helpful, not required

        const rowsRaw = await querySectionRows({
          databaseId: sec.databaseId,
          carrierRelationProp: sec.carrierRelationProp, // "Carrier"
          carrierPageId: page.id,
          extraFilter: sec.extraFilter, // optional
          sort: sec.sort, // optional
        });
        console.log(`🔎 Section rows: ${sec.section} -> ${rowsRaw.length}`);

        // Skip empty sections to keep chunks clean
        if (rowsRaw.length === 0) {
          console.log(`ℹ️ Skipping empty section ${sec.section} for ${title}`);
          continue;
        }

        const rowsData = rowsRaw.map((r) => extractRowCells(r, sec.columns));

        // Percent formatting for Commissions
        if (sec.section === "Commissions") {
          for (const r of rowsData) {
            if ("New Business" in r) r["New Business"] = asPercent(r["New Business"]);
            if ("Renewal" in r) r["Renewal"] = asPercent(r["Renewal"]);
          }
        }

        md += "\n\n" + renderMarkdownTable(sec.section, sec.columns, rowsData);
        console.log(`🧱 Appended ${sec.section} with ${rowsRaw.length} rows`);
      } catch (e) {
        console.warn(`⚠️ Section "${sec.section}" failed for ${title}:`, e.message);
      }
    }

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

  const nextOffset = offset + slice.length;
  const done = nextOffset >= pages.length;

  return {
    ok: true,
    totalPages: pages.length,
    processed: slice.length,
    offsetStart: offset,
    nextOffset: done ? null : nextOffset,
    done,
    titlesProcessed: slice.map(getTitle),
  };
}
