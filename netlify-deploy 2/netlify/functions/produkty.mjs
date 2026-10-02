import { store, katalogStore, jePrihlasen, json, chyba, nepovoleno } from './_spolecne.mjs';

const KLIC = 'produkty/index.json';
const MAX_BAJTU = 4 * 1024 * 1024;
const VYCHOZI = [
  { id: 'rustikalni-lampa-1', nazev: 'Rustikální lampa 1', popis: '', cena: '', obrazek: '', aktivni: false, poradi: 1 },
  { id: 'rustikalni-lampa-2', nazev: 'Rustikální lampa 2', popis: '', cena: '', obrazek: '', aktivni: false, poradi: 2 },
  { id: 'rustikalni-lampa-3', nazev: 'Rustikální lampa 3', popis: '', cena: '', obrazek: '', aktivni: false, poradi: 3 },
  { id: 'vyrezavane-srdce', nazev: 'Vyřezávané srdce', popis: '', cena: '', obrazek: '', aktivni: false, poradi: 4 }
];

function serad(data) {
  data.polozky.sort((a, b) => (a.poradi || 0) - (b.poradi || 0));
  data.polozky.forEach((p, i) => { p.poradi = i + 1; });
  return data;
}

async function nacti() {
  const trvale = katalogStore();
  const data = await trvale.get(KLIC, { type: 'json' });
  if (data && Array.isArray(data.polozky)) return serad(data);

  // Jednorázový přechod starších dat uložených v původním úložišti.
  const starsi = await store().get(KLIC, { type: 'json' });
  if (starsi && Array.isArray(starsi.polozky)) {
    await trvale.setJSON(KLIC, starsi);
    return serad(starsi);
  }
  return { polozky: VYCHOZI.map(p => ({ ...p })) };
}

async function ulozObrazek(data, id) {
  if (!data) return;
  const cista = String(data).replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(cista, 'base64');
  if (!buffer.length) throw new Error('Fotku se nepodařilo načíst.');
  if (buffer.length > MAX_BAJTU) throw new Error('Fotka je po zmenšení stále příliš velká.');
  await katalogStore().set('produkt-foto/' + id, buffer, { metadata: { typ: 'image/webp' } });
}

export default async (req) => {
  const url = new URL(req.url);
  const casti = url.pathname.split('/').filter(Boolean);
  const id = casti.length > 2 ? decodeURIComponent(casti[2]) : null;

  if (req.method === 'GET') {
    const data = await nacti();
    return json({ polozky: data.polozky }, 200, { 'Cache-Control': 'no-store', 'Netlify-CDN-Cache-Control': 'no-store' });
  }
  if (!(await jePrihlasen(req))) return nepovoleno();

  if (req.method === 'POST') {
    const telo = await req.json().catch(() => null);
    if (!telo || !String(telo.nazev || '').trim()) return chyba('Chybí název produktu.');
    const data = await nacti();
    const idNovy = Date.now().toString(36);
    const polozka = { id: idNovy, nazev: String(telo.nazev).trim().slice(0, 120), popis: String(telo.popis || '').trim().slice(0, 1000), cena: String(telo.cena || '').trim().slice(0, 40), obrazek: String(telo.obrazek || '').trim().slice(0, 300), aktivni: !!telo.aktivni, poradi: data.polozky.length + 1 };
    try {
      if (telo.obrazekData) {
        await ulozObrazek(telo.obrazekData, idNovy);
        polozka.obrazek = '/api/produkt-foto/' + encodeURIComponent(idNovy);
      }
    } catch (e) { return chyba(e.message, 413); }
    data.polozky.push(polozka);
    await katalogStore().setJSON(KLIC, serad(data));
    return json({ ok: true, polozka });
  }

  if (!id) return chyba('Chybí ID produktu.');
  const data = await nacti();
  const polozka = data.polozky.find(p => p.id === id);
  if (!polozka) return chyba('Produkt nenalezen.', 404);

  if (req.method === 'PATCH') {
    const telo = await req.json().catch(() => null);
    if (!telo) return chyba('Neplatný požadavek.');
    ['nazev', 'popis', 'cena', 'obrazek'].forEach(k => { if (typeof telo[k] === 'string') polozka[k] = telo[k].trim().slice(0, k === 'popis' ? 1000 : 300); });
    if (typeof telo.obrazekData === 'string' && telo.obrazekData) {
      try {
        await ulozObrazek(telo.obrazekData, id);
        polozka.obrazek = '/api/produkt-foto/' + encodeURIComponent(id);
      } catch (e) { return chyba(e.message, 413); }
    }
    if (typeof telo.aktivni === 'boolean') polozka.aktivni = telo.aktivni;
    if (Number.isInteger(telo.poradi)) polozka.poradi = Math.max(1, Math.min(data.polozky.length, telo.poradi));
    await katalogStore().setJSON(KLIC, serad(data));
    return json({ ok: true });
  }
  if (req.method === 'DELETE') {
    data.polozky = data.polozky.filter(p => p.id !== id);
    await katalogStore().setJSON(KLIC, serad(data));
    await katalogStore().delete('produkt-foto/' + id);
    return json({ ok: true });
  }
  return chyba('Nepodporovaná metoda', 405);
};

export const config = { path: ['/api/produkty', '/api/produkty/:id'] };
