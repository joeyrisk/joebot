// /pages/api/dump-schemas.js

import { notionDbMap } from "../../lib/notionDbMap.mjs";

export default async function handler(req, res) {
  try {
    const keys = Object.keys(notionDbMap || {});

    return res.status(200).json({
      ok: true,
      checked: keys.length,
      availableSchemas: keys,
      map: notionDbMap
    });
  } catch (err) {
    console.error("❌ Failed to load notionDbMap:", err.message);
    return res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
}
