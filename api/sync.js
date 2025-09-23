import { validateEnvVars } from "../lib/validateEnv.js";
import { notionDbMap } from "../lib/notionDbMap.mjs";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  validateEnvVars([
    "NOTION_TOKEN",
    ...Object.values(notionDbMap)
      .map((v) => {
        const match = /process\.env\.(\w+)/.exec(v?.toString());
        return match?.[1];
      })
      .filter(Boolean),
  ]);

  const schemas = [];

  for (const [key, value] of Object.entries(notionDbMap)) {
    const dbId = value?.id || value;
    if (!dbId) continue;

    try {
      const db = await notion.databases.retrieve({ database_id: dbId });
      schemas.push(key);
    } catch (err) {
      console.warn(`❌ Failed to retrieve schema for ${key}:`, err.message);
    }
  }

  return res.status(200).json({
    ok: true,
    synced: schemas.length,
    schemas,
  });
}
