export const config = {
  schedule: '0 10 * * *',
};

export default async function handler(req, res) {
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

