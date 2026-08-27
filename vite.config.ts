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

/** Dev-only parity endpoint for the production Vercel /api/time function. */
function devTimeEndpoint(): Plugin {
  return {
    name: 'little-explorers-dev-time',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/time', (_request, response) => {
        const now = new Date();
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(JSON.stringify({ now: now.toISOString(), taipeiDate: taipeiDate(now), timeZone: 'Asia/Taipei' }));
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devTimeEndpoint()],
  base: './',
});
