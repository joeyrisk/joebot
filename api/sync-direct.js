// api/sync-direct.js
// Blocks until a batch of carriers is synced so you can see logs & results in Vercel.
// Usage (POST):
//   /api/sync-direct?limit=1&offset=0&reset=true
//   /api/sync-direct?limit=1&offset=1
// Header required:
//   x-sync-token: <your SYNC_TOKEN>

import { runSync } from "../lib/sync.mjs";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST" });
    }

    // Simple auth via header
    const sent = req.headers["x-sync-token"];
    const expected = process.env.SYNC_TOKEN;
    if (!expected || sent !== expected) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Parse query params (?limit=&offset=&reset=)
    // Use the host header to construct a valid absolute URL in Vercel/Node runtime
    const base = `https://${req.headers.host || "localhost"}`;
    const url = new URL(req.url, base);
    const limit = Number(url.searchParams.get("limit") || "1");   // default small to avoid timeouts
    const offset = Number(url.searchParams.get("offset") || "0");
    const reset = (url.searchParams.get("reset") || "false").toLowerCase() === "true";

    console.log("🚀 Starting Notion sync (direct, blocking)…", { limit, offset, reset });

    const result = await runSync({ limit, offset, reset });

    console.log("✅ Sync complete batch:", result);

    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error("❌ Sync failed:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
