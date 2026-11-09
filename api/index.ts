import { createExpressApp } from '../backend/app';

const app = createExpressApp();

export default function handler(req: any, res: any) {
  try {
    const rawUrl: string = req.url || '/';

    // 1. If Vercel rewrote with __path parameter
    if (rawUrl.includes('__path=')) {
      const parsed = new URL(rawUrl, 'http://localhost');
      const pathParam = parsed.searchParams.get('__path');
      if (pathParam) {
        parsed.searchParams.delete('__path');
        const search = parsed.searchParams.toString();
        const cleanPath = pathParam.replace(/^\/+/, '');
        req.url = `/api/${cleanPath}${search ? '?' + search : ''}`;
      }
    } else {
      // 2. If Vercel headers preserved the original URL
      const orig = (req.headers?.['x-vercel-original-url'] ||
        req.headers?.['x-matched-path'] ||
        req.headers?.['x-forwarded-uri'] ||
        req.headers?.['x-original-uri']) as string | undefined;

      if (orig && typeof orig === 'string' && orig.startsWith('/api/')) {
        const qIndex = rawUrl.indexOf('?');
        const search = qIndex >= 0 ? rawUrl.slice(qIndex) : '';
        req.url = orig.includes('?') ? orig : `${orig}${search}`;
      } else if (rawUrl === '/api' || rawUrl.startsWith('/api?')) {
        // 3. Fallback: if rawUrl is /api?q=..., direct to search
        const parsed = new URL(rawUrl, 'http://localhost');
        if (parsed.searchParams.has('q')) {
          req.url = `/api/v1/search${parsed.search}`;
        }
      }
    }
  } catch { }

  return app(req, res);
}
