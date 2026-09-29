import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { mountJamaatRoutes } from './src/db/routes.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const publicDir = path.join(packageRoot, 'public', 'jamaat');

const HOST = process.env.JAMAAT_UI_HOST ?? '127.0.0.1';
const PORT = Number(process.env.JAMAAT_UI_PORT ?? process.env.PORT ?? 3847);

const app = express();
app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok', service: 'jamaat-admin' });
});

mountJamaatRoutes(app);

app.use(express.static(publicDir));

app.get('/', (_request, response) => {
  response.sendFile(path.join(publicDir, 'index.html'));
});

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' });
});

app.listen(PORT, HOST, () => {
  console.log(`Jamaat admin UI listening on http://${HOST}:${PORT}`);
  console.log('');
  console.log('From your Mac (SSH port forward — works on any network):');
  console.log(`  ssh -L ${PORT}:${HOST}:${PORT} <user>@<fedora-host>`);
  console.log(`  open http://127.0.0.1:${PORT}`);
  console.log('');
  console.log('Optional: listen on all interfaces (same LAN, no SSH):');
  console.log(`  JAMAAT_UI_HOST=0.0.0.0 npm run jamaat-ui`);
  console.log(`  then open http://<fedora-ip>:${PORT}`);
});
