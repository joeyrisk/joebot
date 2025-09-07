export const config = {
  schedule: '0 10 * * *', // Runs daily at 10am UTC
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Cron endpoint ready.' });
  }

  const endpoint = `${process.env.BASE_URL}/api/sync`;
  const syncToken = process.env.SYNC_TOKEN;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-sync-token': syncToken,
      },
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Sync failed');

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
