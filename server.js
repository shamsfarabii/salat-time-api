import express from 'express';
import { resolveRequest } from './src/validation/parse-request.js';
import { buildSalahTimesResponse } from './src/formatting/response-format.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/salah-times', (request, response) => {
  const resolved = resolveRequest(request.query);
  if (!resolved.ok) {
    response.status(400).json({ error: resolved.error });
    return;
  }

  response.json(buildSalahTimesResponse(resolved.value));
});

app.post('/salah-times', (request, response) => {
  const resolved = resolveRequest(request.body ?? {});
  if (!resolved.ok) {
    response.status(400).json({ error: resolved.error });
    return;
  }

  response.json(buildSalahTimesResponse(resolved.value));
});

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Salah Time API listening on http${process.env.USE_SSL ? 's' : ''}://${process.env.HOST || 'localhost'}:${PORT}`);
});
