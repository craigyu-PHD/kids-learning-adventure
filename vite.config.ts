import { createHash } from 'node:crypto';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function taipeiDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

/** Dev-only parity endpoints for trusted-time and family-session APIs. */
function devApiEndpoints(): Plugin {
  return {
    name: 'little-explorers-dev-time',
    apply: 'serve',
    configureServer(server) {
      const handler = (_request: unknown, response: import('node:http').ServerResponse) => {
        const now = new Date();
        const activeDate = taipeiDate(now);
        const taipeiTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(now);
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(JSON.stringify({ now: now.toISOString(), activeDate, taipeiDate: activeDate, taipeiTime, timeZone: 'Asia/Taipei' }));
      };
      server.middlewares.use('/api/server-time', handler);
      server.middlewares.use('/api/time', handler);
      server.middlewares.use('/api/family-session', (request, response, next) => {
        if (request.method !== 'POST') { next(); return; }
        let raw = '';
        request.setEncoding('utf8');
        request.on('data', (chunk) => { raw += chunk; });
        request.on('end', () => {
          try {
            const payload = JSON.parse(raw || '{}') as { pin?: unknown };
            const pin = typeof payload.pin === 'string' ? payload.pin.replace(/\D/g, '').slice(0, 6) : '';
            if (!/^\d{4,6}$/.test(pin)) {
              response.statusCode = 400;
              response.setHeader('Content-Type', 'application/json; charset=utf-8');
              response.end(JSON.stringify({ error: 'PIN must contain 4–6 digits' }));
              return;
            }
            const familyId = createHash('sha256').update(`little-explorers-dev-family:${pin}`).digest('hex');
            const expiresAtSeconds = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.setHeader('Cache-Control', 'no-store');
            response.end(JSON.stringify({ familyId, token: `dev.${familyId}.${expiresAtSeconds}.local-development-session`, expiresAt: new Date(expiresAtSeconds * 1000).toISOString() }));
          } catch {
            response.statusCode = 400;
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.end(JSON.stringify({ error: 'Invalid request' }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApiEndpoints()],
  base: './',
});
