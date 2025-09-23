import { Client } from "@notionhq/client";
import { notionDbMap } from "../lib/notionDbMap.mjs";

const notion = new Client({ auth: process.env.NOTION_TOKEN });

export default async function handler(req, res) {
  const results = [];

  for (const [key, envRef] of Object.entries(notionDbMap)) {
    const match = /process\.env\.(\w+)/.exec(envRef?.toString());
    const envKey = match?.[1];
    const envValue = envKey ? process.env[envKey] : envRef;

    if (!envValue) {
      results.push({ db: key, status: "❌ MISSING ENV", envKey });
      continue;
    }

    try {
      const response = await notion.databases.query({
        database_id: envValue,
        page_size: 1,
      });

      results.push({
        db: key,
        status: "✅ OK",
        count: response.results.length,
      });
    } catch (err) {
      results.push({
        db: key,
        status: "❌ QUERY FAILED",
        error: err.message,
      });
    }
  }

  res.status(200).json({ ok: true, checked: results.length, results });
}

