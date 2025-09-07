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

    console.log("Expected token:", expected);
    console.log("Received token:", sent);

    console.log("🔑 Expected SYNC_TOKEN from env:", expected);
    console.log("📩 Received x-sync-token header:", sent);

    if (!expected || sent !== expected) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await runSync(); // does the heavy lifting
    return res.status(200).json({ ok: true, ...result });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: e.message || 'sync failed' });
  }
}
