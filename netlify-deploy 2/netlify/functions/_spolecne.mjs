import { getStore, getDeployStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const NAZEV_STORE = 'galerie';
const KLIC_INDEX = 'index.json';
const COOKIE = 'vlasak_admin';
const PLATNOST_DNI = 30;

/* Výchozí obsah galerie, dokud admin nic nenahraje.
   Odpovídá fotkám, které na webu jsou dnes. */
const VYCHOZI = [
  { id: 'vychozi-pergola', soubor: 'images/realizace/Pergola.png', popisek: 'Zahradní pergola', alt: 'Zahradní pergola s ohništěm', poradi: 1, sirka: 1080, vyska: 1080, naUvodu: true },
  { id: 'vychozi-kuchyn', soubor: 'images/realizace/Kuchyn.png', popisek: 'Kuchyňská linka na míru', alt: 'Montáž kuchyňské linky', poradi: 2, sirka: 1080, vyska: 1080, naUvodu: true },
  { id: 'vychozi-zahrada', soubor: 'images/realizace/zahrada.png', popisek: 'Úprava zahrady', alt: 'Úprava zahrady s posezením', poradi: 3, sirka: 896, vyska: 1195, naUvodu: true }
];

export function store() {
  const produkce = process.env.CONTEXT === 'production';
  const opts = { name: NAZEV_STORE, consistency: 'strong' };
  return produkce ? getStore(opts) : getDeployStore(opts);
}

export async function nactiIndex() {
  const s = store();
  const data = await s.get(KLIC_INDEX, { type: 'json' });
  if (!data || !Array.isArray(data.polozky)) return { polozky: VYCHOZI.slice() };
  return data;
}

export async function ulozIndex(data) {
  data.polozky.sort((a, b) => (a.poradi || 0) - (b.poradi || 0));
  data.polozky.forEach((p, i) => { p.poradi = i + 1; });
  await store().setJSON(KLIC_INDEX, data);
  return data;
}

/* ---------- Přihlášení ----------
   Heslo i podpisový klíč žijí v Blobs, ne v proměnných prostředí.
   Díky tomu se celý web nasadí přetažením složky a nic se nenastavuje ručně. */

const KLIC_HESLO = 'auth/heslo.json';
const KLIC_TAJEMSTVI = 'auth/tajemstvi';

export async function jeHesloNastaveno() {
  const zaznam = await store().get(KLIC_HESLO, { type: 'json' });
  return !!(zaznam && zaznam.hash);
}

/* Při prvním nasazení lze heslo předat pouze přes chráněné nastavení Netlify.
   Do zdrojových souborů ani do GitHubu se nikdy neukládá. Po prvním načtení
   se z něj vytvoří nevratný otisk v úložišti galerie. */
export async function zajistiPocatecniHeslo() {
  if (await jeHesloNastaveno()) return true;
  const heslo = process.env.ADMIN_INITIAL_PASSWORD || '';
  if (heslo.length < 12) return false;
  await nastavHeslo(heslo);
  return true;
}

export async function nastavHeslo(heslo) {
  const sul = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(heslo, sul, 64).toString('hex');
  await store().setJSON(KLIC_HESLO, { sul, hash, zmeneno: new Date().toISOString() });
}

export async function overHeslo(heslo) {
  if (!heslo) return false;
  const zaznam = await store().get(KLIC_HESLO, { type: 'json' });
  if (!zaznam || !zaznam.hash) return false;
  const vypocet = crypto.scryptSync(heslo, zaznam.sul, 64).toString('hex');
  const a = Buffer.from(vypocet, 'hex');
  const b = Buffer.from(zaznam.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function tajemstvi() {
  const s = store();
  let klic = await s.get(KLIC_TAJEMSTVI, { type: 'text' });
  if (!klic) {
    klic = crypto.randomBytes(32).toString('hex');
    await s.set(KLIC_TAJEMSTVI, klic);
  }
  return klic;
}

export async function vytvorToken() {
  const konec = Date.now() + PLATNOST_DNI * 86400000;
  const telo = String(konec);
  const podpis = crypto.createHmac('sha256', await tajemstvi()).update(telo).digest('hex');
  return telo + '.' + podpis;
}

export async function overToken(token) {
  if (!token || !token.includes('.')) return false;
  const [telo, podpis] = token.split('.');
  if (!/^[0-9a-f]+$/.test(podpis || '')) return false;
  const ocekavany = crypto.createHmac('sha256', await tajemstvi()).update(telo).digest('hex');
  const a = Buffer.from(podpis, 'hex');
  const b = Buffer.from(ocekavany, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(telo) > Date.now();
}

export async function jePrihlasen(req) {
  const cookies = req.headers.get('cookie') || '';
  const nalez = cookies.split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE + '='));
  if (!nalez) return false;
  return overToken(decodeURIComponent(nalez.split('=')[1]));
}

export function cookieHlavicka(token) {
  const zaklad = `${COOKIE}=${encodeURIComponent(token || '')}; Path=/; HttpOnly; Secure; SameSite=Strict`;
  return token ? `${zaklad}; Max-Age=${PLATNOST_DNI * 86400}` : `${zaklad}; Max-Age=0`;
}

/* ---------- Brzda proti hádání hesla ---------- */

export async function zkontrolujPokusy(ip) {
  const s = store();
  const zaznam = await s.get('pokusy/' + ip, { type: 'json' });
  if (!zaznam) return true;
  if (zaznam.blokovanoDo && zaznam.blokovanoDo > Date.now()) return false;
  return true;
}

export async function zapisPokus(ip, uspech) {
  const s = store();
  const klic = 'pokusy/' + ip;
  if (uspech) { await s.delete(klic); return; }
  const zaznam = (await s.get(klic, { type: 'json' })) || { pocet: 0 };
  zaznam.pocet += 1;
  if (zaznam.pocet >= 5) {
    zaznam.blokovanoDo = Date.now() + 15 * 60 * 1000;
    zaznam.pocet = 0;
  }
  await s.setJSON(klic, zaznam);
}

/* ---------- Odpovědi ---------- */

export function json(telo, status = 200, hlavicky = {}) {
  return new Response(JSON.stringify(telo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...hlavicky }
  });
}

export function chyba(zprava, status = 400) {
  return json({ chyba: zprava }, status);
}

export function nepovoleno() {
  return chyba('Nejste přihlášen. Přihlaste se prosím znovu.', 401);
}
