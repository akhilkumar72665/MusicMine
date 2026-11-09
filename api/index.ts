import { createExpressApp } from '../server';

const app = createExpressApp();

export default function handler(req: any, res: any) {
  const original = req.headers['x-matched-path'] || req.headers['x-vercel-original-url'];
  if (original && typeof original === 'string' && original.startsWith('/api') && req.url === '/api') {
    req.url = original;
  }
  return app(req, res);
}
