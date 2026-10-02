import { store, jePrihlasen, json, chyba, nepovoleno } from './_spolecne.mjs';

const KLIC = 'poptavky/index.json';

export default async (req) => {
  const data = (await store().get(KLIC, { type: 'json' })) || { polozky: [] };
  if (req.method === 'GET') {
    if (!(await jePrihlasen(req))) return nepovoleno();
    return json({ polozky: data.polozky });
  }
  if (req.method !== 'POST') return chyba('Nepodporovaná metoda', 405);
  const telo = await req.json().catch(() => null);
  if (!telo || !String(telo.jmeno || '').trim() || !String(telo.email || '').trim() || !String(telo.produkt || '').trim()) return chyba('Vyplňte prosím jméno, e-mail a produkt.');
  data.polozky.unshift({ id: Date.now().toString(36), jmeno: String(telo.jmeno).trim().slice(0, 120), email: String(telo.email).trim().slice(0, 160), telefon: String(telo.telefon || '').trim().slice(0, 40), produkt: String(telo.produkt).trim().slice(0, 160), zprava: String(telo.zprava || '').trim().slice(0, 1000), stav: 'nová', vytvoreno: new Date().toISOString() });
  await store().setJSON(KLIC, data);
  return json({ ok: true });
};

export const config = { path: '/api/poptavky' };
