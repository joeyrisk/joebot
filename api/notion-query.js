// /api/notion-query.js
import { Client, APIErrorCode } from "@notionhq/client";
import { notionDbMap } from "../lib/notionDbMap.mjs";
import { validateEnvVars } from "../lib/validateEnv.js";
import { carrierLookup } from "../lib/carrierLookup.mjs"; // ✅ always available

// ✅ ENV validation
validateEnvVars([
  "NOTION_TOKEN",
  ...Object.values(notionDbMap)
    .map((v) => {
      const m = /process\.env\.(\w+)/.exec(v?.databaseId?.toString?.() || "");
      return m?.[1];
    })
    .filter(Boolean),
]);

console.log("✅ All required ENV variables are present.");
console.log("✅ Loaded notionDbMap:", notionDbMap);

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
  notionVersion: "2025-09-03",
});

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Use GET" });
  }

  const { db, type } = req.query;

  if (!db || !notionDbMap[db]) {
    return res.status(400).json({ error: "Missing or invalid 'db' param" });
  }

  const config = notionDbMap[db];
  const dataSourceId = config?.dataSourceId;

  if (!dataSourceId) {
    return res.status(500).json({ error: "Data Source ID not configured." });
  }

  try {
    // 🔎 If we need schema, retrieve the data source instead of the database
    const dsMeta = await notion.request({
      path: `data_sources/${dataSourceId}`,
      method: "GET",
    });

    const propertyType = config.filterField
      ? dsMeta?.properties?.[config.filterField]?.type
      : null;

    let filter;
    if (config.filterField && type && propertyType) {
      let finalType = type;

      // ✅ Universal Carrier relation handling
      if (propertyType === "relation" && config.filterField === "Carrier") {
        const uuid = carrierLookup[type] || null;
        if (uuid) {
          finalType = uuid;
        } else {
          console.warn(`⚠️ No UUID mapping found for "${type}".`);
          return res.status(400).json({
            ok: false,
            error: `No UUID mapping found for "${type}". Please update Carriers DB.`,
          });
        }
      }

      switch (propertyType) {
        case "select":
          filter = { property: config.filterField, select: { equals: finalType } };
          break;
        case "relation":
          filter = { property: config.filterField, relation: { contains: finalType } };
          break;
        case "multi_select":
          filter = { property: config.filterField, multi_select: { contains: finalType } };
          break;
        case "status":
          filter = { property: config.filterField, status: { equals: finalType } };
          break;
        case "rich_text":
          filter = { property: config.filterField, rich_text: { contains: finalType } };
          break;
        default:
          console.warn(`❗ Unsupported filter type: ${propertyType}`);
      }
    }

    console.log("🔎 Filtering with type:", propertyType);
    console.log("🧪 Final filter:", filter);

    // ✅ Query the data source
    const response = await notion.request({
      path: `data_sources/${dataSourceId}/query`,
      method: "POST",
      body: filter ? { filter } : {},
    });

    const results = (response.results || []).map((page) => {
      const props = page.properties || {};
      return Object.fromEntries(
        Object.entries(props).map(([k, v]) => {
          try {
            switch (v?.type) {
              case "title":
                return [k, v.title?.[0]?.plain_text || ""];
              case "select":
                return [k, v.select?.name || ""];
              case "email":
                return [k, v.email || ""];
              case "phone_number":
                return [k, v.phone_number || ""];
              case "rich_text":
                return [k, v.rich_text?.[0]?.plain_text || ""];
              case "relation":
                return [k, v.relation?.map(r => r.id) || []];
              case "multi_select":
                return [k, v.multi_select?.map(item => item.name) || []];
              case "checkbox":
                return [k, v.checkbox || false];
              case "number":
                return [k, v.number || null];
              case "url":
                return [k, v.url || ""];
              case "date":
                return [k, v.date?.start || ""];
              default:
                return [k, null];
            }
          } catch (err) {
            console.warn(`Parse error for ${k}:`, err);
            return [k, null];
          }
        })
      );
    });

    const sorted = results.sort((a, b) =>
      (a.Name || "").localeCompare(b.Name || "")
    );

    res.status(200).json({
      ok: true,
      count: sorted.length,
      data: sorted,
    });
  } catch (err) {
    console.error("Notion query error:", err);
    if (err.code === APIErrorCode.ValidationError) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    return res.status(500).json({ ok: false, error: "Internal server error." });
  }
}
