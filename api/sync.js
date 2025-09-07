// api/sync.js
import { runSync } from '../lib/sync.mjs';

/**
 * Secure POST endpoint that rebuilds the vector store from Notion.
 * You must send a header:  x-sync-token: <your secret>
 */

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Use POST' });
    }

    const sent = req.headers['x-sync-token'];
    const expected = process.env.SYNC_TOKEN;

    console.log("🔑 Expected SYNC_TOKEN from env:", expected);
    console.log("📩 Received x-sync-token header:", sent);

    if (!expected || sent !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ✅ Respond early to avoid timeout
    res.status(202).json({ ok: true, message: 'Sync started in background' });

    // 🔄 Run sync in background (after response is sent)
    setTimeout(async () => {
      try {
        console.log("🔁 Starting Notion sync in background...");
        const result = await runSync();
        console.log("✅ Background sync complete:", result);
      } catch (err) {
        console.error("❌ Background sync failed:", err.message);
      }
    }, 0);

  } catch (e) {
    console.error(e);
    // Just log the error, don't try to respond again
  }
}
