import {
  store, nactiIndex, ulozIndex, jePrihlasen, json, chyba, nepovoleno
} from './_spolecne.mjs';

const MAX_BAJTU = 4 * 1024 * 1024; // fotka už je zmenšená v prohlížeči

function noveId() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export default async (req) => {
  const url = new URL(req.url);
  const castiCesty = url.pathname.split('/').filter(Boolean);
  const id = castiCesty.length > 2 ? decodeURIComponent(castiCesty[2]) : null;

  /* ---------- Veřejný výpis ---------- */
  if (req.method === 'GET') {
    const data = await nactiIndex();
    const polozky = data.polozky
      .slice()
      .sort((a, b) => (a.poradi || 0) - (b.poradi || 0));
    return json({ polozky, celkem: polozky.length }, 200, {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': 'public, max-age=60, stale-while-revalidate=300'
    });
  }

  /* ---------- Od tohoto místa jen pro přihlášené ---------- */
  if (!(await jePrihlasen(req))) return nepovoleno();

  if (req.method === 'POST') {
    let telo;
    try {
      telo = await req.json();
    } catch {
      return chyba('Nepodařilo se načíst data fotky.');
    }

    const { data, popisek, alt, sirka, vyska } = telo;
    if (!data || typeof data !== 'string') return chyba('Chybí fotka.');

    const cista = data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(cista, 'base64');
    if (!buffer.length) return chyba('Fotka se nepodařilo načíst.');
    if (buffer.length > MAX_BAJTU) {
      return chyba('Fotka je i po zmenšení moc velká. Zkuste jinou.', 413);
    }

    const novyId = noveId();
    await store().set('foto/' + novyId, buffer, {
      metadata: { typ: 'image/webp' }
    });

    const index = await nactiIndex();
    index.polozky.push({
      id: novyId,
      popisek: (popisek || '').trim().slice(0, 120),
      alt: (alt || popisek || 'Realizace').trim().slice(0, 160),
      poradi: 0, // nová fotka jde na začátek
      naUvodu: false,
      sirka: Number(sirka) || null,
      vyska: Number(vyska) || null,
      vytvoreno: new Date().toISOString()
    });
    await ulozIndex(index);

    return json({ ok: true, id: novyId });
  }

  if (req.method === 'PATCH') {
    if (!id) return chyba('Chybí ID fotky.');
    let telo;
    try {
      telo = await req.json();
    } catch {
      return chyba('Neplatný požadavek.');
    }

    const index = await nactiIndex();
    const polozka = index.polozky.find(p => p.id === id);
    if (!polozka) return chyba('Fotka nenalezena.', 404);

    if (typeof telo.popisek === 'string') polozka.popisek = telo.popisek.trim().slice(0, 120);
    if (typeof telo.alt === 'string') polozka.alt = telo.alt.trim().slice(0, 160);
    if (typeof telo.naUvodu === 'boolean') {
      if (telo.naUvodu && index.polozky.filter(p => p.naUvodu).length >= 6) {
        return chyba('Na úvodní stránce může být nejvýše 6 fotek. Nejprve jednu odeberte.');
      }
      polozka.naUvodu = telo.naUvodu;
    }

    if (telo.smer === 'nahoru' || telo.smer === 'dolu') {
      const serazene = index.polozky.sort((a, b) => (a.poradi || 0) - (b.poradi || 0));
      const i = serazene.findIndex(p => p.id === id);
      const j = telo.smer === 'nahoru' ? i - 1 : i + 1;
      if (j >= 0 && j < serazene.length) {
        [serazene[i].poradi, serazene[j].poradi] = [serazene[j].poradi, serazene[i].poradi];
      }
    }

    await ulozIndex(index);
    return json({ ok: true });
  }

  if (req.method === 'DELETE') {
    if (!id) return chyba('Chybí ID fotky.');
    const index = await nactiIndex();
    const i = index.polozky.findIndex(p => p.id === id);
    if (i === -1) return chyba('Fotka nenalezena.', 404);

    const [odebrana] = index.polozky.splice(i, 1);
    if (!odebrana.soubor) {
      await store().delete('foto/' + odebrana.id);
    }
    await ulozIndex(index);
    return json({ ok: true });
  }

  return chyba('Nepodporovaná metoda', 405);
};

export const config = {
  path: ['/api/galerie', '/api/galerie/:id']
};
