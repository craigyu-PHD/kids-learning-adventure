const TIME_ZONE = 'Asia/Taipei';

function taipeiParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'no-store',
        },
      });
    }
    if (request.method !== 'GET') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const now = new Date();
    const p = taipeiParts(now);
    const activeDate = `${p.year}-${p.month}-${p.day}`;
    const taipeiTime = `${p.hour}:${p.minute}:${p.second}`;
    return Response.json({
      now: now.toISOString(),
      activeDate,
      taipeiDate: activeDate,
      taipeiTime,
      timeZone: TIME_ZONE,
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
};
