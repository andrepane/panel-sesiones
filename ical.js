// /api/ical.js
export default async function handler(req, res) {
  try {
    const url = process.env.; // pon aquí la URL .ics via variable de entorno
    if (!url) {
      res.status(500).json({ error: 'ICS_URL not set' });
      return;
    }

    const upstream = await fetch(url, { headers: { 'user-agent': 'panel-sesiones/1.0' } });
    const text = await upstream.text();

    if (!upstream.ok) {
      res.status(upstream.status).send(text);
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=86400');
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
