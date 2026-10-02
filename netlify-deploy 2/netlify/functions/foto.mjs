import { store } from './_spolecne.mjs';

export default async (req) => {
  const casti = new URL(req.url).pathname.split('/').filter(Boolean);
  const id = decodeURIComponent(casti[casti.length - 1] || '');
  if (!id) return new Response('Chybí ID', { status: 400 });

  const data = await store().get('foto/' + id, { type: 'arrayBuffer' });
  if (!data) return new Response('Fotka nenalezena', { status: 404 });

  return new Response(data, {
    headers: {
      'Content-Type': 'image/webp',
      // ID je neměnné, obsah se nikdy nemění — může se cachovat natrvalo
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Netlify-CDN-Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
};

export const config = {
  path: '/api/foto/:id'
};
