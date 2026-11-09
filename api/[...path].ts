import { createExpressApp } from '../backend/app';

const app = createExpressApp();

export default function handler(req: any, res: any) {
  try {
    const rawUrl: string = req.url || '/';
    // If Vercel passed query via __path or similar
    if (rawUrl.includes('__path=')) {
      const parsed = new URL(rawUrl, 'http://localhost');
      const pathParam = parsed.searchParams.get('__path');
      if (pathParam) {
        parsed.searchParams.delete('__path');
        const search = parsed.searchParams.toString();
        const cleanPath = pathParam.replace(/^\/+/, '');
        req.url = `/api/${cleanPath}${search ? '?' + search : ''}`;
      }
    }
  } catch { }

  return app(req, res);
}

