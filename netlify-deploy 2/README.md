# Řemeslné práce Vlasák — web pro Netlify

Statický web podle vašeho letáku. Připravený k nasazení drag & drop na Netlify.

## Co je v balíčku

- `index.html` — hlavní stránka (3 sloupce služeb, galerie, hodnoty, kontakt s formulářem)
- `404.html` — chybová stránka
- `netlify.toml` — konfigurace (security headers, cache)
- `robots.txt`, `sitemap.xml` — pro vyhledávače
- `images/realizace/` — placeholder fotky (nahraďte vlastními!)

## Jak nasadit (3 minuty)

1. Otevřete **https://app.netlify.com/drop**
2. **Přetáhněte celou složku** `netlify-deploy` do prohlížeče (ne jednotlivé soubory)
3. Hotovo — dostanete URL typu `https://nazev-12345.netlify.app`

## Aktivace e-mailových notifikací z formuláře

Po nasazení v Netlify dashboardu:
1. **Site → Forms** → uvidíte formulář "poptavka"
2. **Forms → Settings → Form notifications → Add notification → Email**
3. Zadat `remeslo@vlasak-kt.cz`
4. **Subject:** `Nová poptávka z webu — Řemeslné práce Vlasák`

Bez tohoto kroku se poptávky budou ukládat na Netlify, ale nepřijdou na mail.

## Jak nahradit placeholder fotky vlastními

V balíčku jsou aktuálně 3 stylizované placeholdery ve složce `images/realizace/`:
- `01-pergola.svg` — místo pro fotku pergoly
- `02-kuchyne.svg` — místo pro fotku kuchyně
- `03-zahrada.svg` — místo pro fotku zahrady

### Postup výměny:

1. **Připravte si 3 fotky** ve formátu JPG nebo PNG
   - Doporučená velikost: cca 1600×1200 px (poměr 4:3)
   - Maximální velikost souboru: do 500 KB (pro rychlé načítání)
   - Optimalizovat můžete na **https://squoosh.app** (zdarma)

2. **Pojmenujte fotky:**
   - `01-pergola.jpg`
   - `02-kuchyne.jpg`
   - `03-zahrada.jpg`

3. **Nahraďte placeholdery:**
   - Smažte stávající `.svg` soubory ve složce `images/realizace/`
   - Vložte tam vaše JPG fotky se stejnými názvy

4. **Upravte HTML:**
   - V souboru `index.html` najděte řádky `images/realizace/01-pergola.svg` (jsou tam 2× pro každou fotku)
   - Změňte `.svg` na `.jpg` (např. `01-pergola.jpg`)
   - Případně změňte popisky (`data-caption` a uvnitř `gallery-caption`)

5. **Nahrajte aktualizovanou složku znovu na Netlify** (drag & drop přes existující site)

### Chcete přidat víc fotek?

Pokud byste chtěli např. 6 nebo 9 fotek místo 3:
1. Přidejte další soubory do `images/realizace/` (např. `04-plot.jpg`, `05-domek.jpg`)
2. V `index.html` najděte sekci `<div class="gallery" id="gallery">`
3. Zkopírujte jeden blok `<div class="gallery-item ...">` a upravte `data-img`, `data-caption`, `src` a `alt`

Nebo mi to pošlete — připravím vám aktualizovaný balíček.

## Vlastní doména remeslovlasak.cz

V Netlify dashboardu:
1. **Domain management → Add custom domain**
2. Zadejte `remeslovlasak.cz`
3. Netlify ukáže DNS záznamy, které je potřeba nastavit u registrátora domény
4. Po propagaci (15 min – 24 h) bude doména funkční včetně HTTPS

## Co web obsahuje (struktura podle vašeho letáku)

1. **Hero** — nadpis "ŘEMESLNÉ PRÁCE VLASÁK", motto "Poctivé řemeslo a pomocná ruka pro váš dům, byt i zahradu", razítkové logo, CTA tlačítka
2. **Služby** — 3 sloupce: VÝROBA, MONTÁŽ, OSTATNÍ PRÁCE (přesně podle letáku)
3. **Realizace** — galerie 3 fotek s lightboxem (zvětšení po kliknutí)
4. **Hodnoty** — Všestrannost ("od kapajícího kohoutku po pergolu") + Spolehlivost ("co slíbíme, to platí")
5. **Kontakt** — claim "Zavolejte a domluvíme se na termínu", kontakty, sociální sítě (Instagram, Facebook), poptávkový formulář
6. **Footer** — kontakty, sociální sítě, navigace

## Pozn. k formuláři

Formulář **NEBUDE fungovat lokálně** (při dvojkliku na `index.html`) — Netlify Forms vyžadují nasazenou stránku. Lokálně se zobrazí chybová hláška, na nasazené stránce vše funguje.

## Co dál

- [ ] Nahradit placeholder fotky vlastními
- [ ] Nahrát balíček na Netlify
- [ ] Aktivovat e-mailové notifikace formuláře
- [ ] Připojit doménu remeslovlasak.cz
- [ ] Zkontrolovat odkazy na Instagram a Facebook (jsou v souboru, případně upravte)
