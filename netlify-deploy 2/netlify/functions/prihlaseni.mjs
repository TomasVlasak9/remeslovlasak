import {
  overHeslo, nastavHeslo, jeHesloNastaveno, zajistiPocatecniHeslo, vytvorToken, cookieHlavicka,
  jePrihlasen, zkontrolujPokusy, zapisPokus, json, chyba
} from './_spolecne.mjs';

export default async (req, context) => {
  const cesta = new URL(req.url).pathname;

  /* Stav — používá admin při načtení stránky */
  if (cesta.endsWith('/stav')) {
    await zajistiPocatecniHeslo();
    return json({
      prihlasen: await jePrihlasen(req),
      nastaveno: await jeHesloNastaveno()
    });
  }

  if (cesta.endsWith('/odhlaseni')) {
    return json({ ok: true }, 200, { 'Set-Cookie': cookieHlavicka(null) });
  }

  if (req.method !== 'POST') return chyba('Nepodporovaná metoda', 405);

  let telo;
  try {
    telo = await req.json();
  } catch {
    return chyba('Neplatný požadavek.');
  }

  /* První heslo se nastavuje výhradně chráněnou proměnnou Netlify,
     nikdy veřejným formulářem. */
  if (cesta.endsWith('/nastaveni-hesla')) {
    return chyba('Počáteční heslo musí nastavit správce webu v chráněném nastavení.', 403);
  }

  /* Změna hesla — jen pro přihlášeného */
  if (cesta.endsWith('/zmena-hesla')) {
    if (!(await jePrihlasen(req))) return chyba('Nejste přihlášen.', 401);
    if (!(await overHeslo(telo.stare || ''))) return chyba('Staré heslo nesouhlasí.', 401);
    if ((telo.nove || '').length < 8) return chyba('Nové heslo musí mít alespoň 8 znaků.');
    await nastavHeslo(telo.nove);
    return json({ ok: true }, 200, { 'Set-Cookie': cookieHlavicka(await vytvorToken()) });
  }

  /* Běžné přihlášení */
  const ip = context.ip || req.headers.get('x-nf-client-connection-ip') || 'neznama';

  if (!(await zkontrolujPokusy(ip))) {
    return chyba('Příliš mnoho pokusů. Zkuste to znovu za 15 minut.', 429);
  }

  if (!(await overHeslo(telo.heslo || ''))) {
    await zapisPokus(ip, false);
    return chyba('Nesprávné heslo.', 401);
  }

  await zapisPokus(ip, true);
  return json({ ok: true }, 200, { 'Set-Cookie': cookieHlavicka(await vytvorToken()) });
};

export const config = {
  path: ['/api/prihlaseni', '/api/odhlaseni', '/api/stav', '/api/nastaveni-hesla', '/api/zmena-hesla']
};
