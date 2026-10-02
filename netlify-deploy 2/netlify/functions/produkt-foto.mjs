import { store } from './_spolecne.mjs';

export default async (req) => {
  const id = decodeURIComponent(new URL(req.url).pathname.split('/').filter(Boolean).pop() || '');
  if (!id) return new Response('Chybí ID', { status: 400 });
  const data = await store().get('produkt-foto/' + id, { type: 'arrayBuffer' });
  if (!data) return new Response('Fotka nenalezena', { status: 404 });
  return new Response(data, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Netlify-CDN-Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
};

export const config = { path: '/api/produkt-foto/:id' };
