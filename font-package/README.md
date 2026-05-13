# ============================================
# FONT SELF-HOSTING — Telepítési Útmutató
# ============================================
# Becsült idő: 5 perc
# Eredmény: ~200-400ms gyorsulás, nincs külső font dependency
# ============================================


## 1. Fájlok bemásolása a repo-ba

Másold a `/fonts/` mappát a repo GYÖKERÉBE:

```
australianweb.agency/
├── fonts/
│   ├── fonts.css                    ← font-face definíciók
│   ├── syne-latin.woff2            ← 34 KB
│   ├── syne-latin-ext.woff2        ← 15 KB
│   ├── space-mono-400-latin.woff2  ← 17 KB
│   ├── space-mono-400-latin-ext.woff2 ← 16 KB
│   ├── space-mono-700-latin.woff2  ← 17 KB
│   └── space-mono-700-latin-ext.woff2 ← 16 KB
├── index.html
├── services.html
├── ...
```

Összesen: ~115 KB (egyszer töltődik, utána cache-ből jön)


## 2. HTML módosítás — MINDEN .html fájlban

### TÖRÖLD ezeket a sorokat (a <head>-ből):

```html
<!-- TÖRÖLD EZEKET: -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

### ADD HOZZÁ HELYETTÜK (ugyanoda a <head>-be):

```html
<!-- Self-hosted fonts — no external dependency -->
<link rel="stylesheet" href="/fonts/fonts.css">
<link rel="preload" href="/fonts/syne-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/space-mono-400-latin.woff2" as="font" type="font/woff2" crossorigin>
```

A `preload` a két legfontosabb fontot azonnal elkezdi tölteni,
nem kell várnia a CSS parse-ra. Ez gyorsabb First Paint-et ad.


## 3. Érintett fájlok listája

Minden HTML fájlban meg kell csinálni a cserét:

- [ ] index.html
- [ ] about.html
- [ ] services.html
- [ ] portfolio.html
- [ ] references.html
- [ ] contact.html
- [ ] website-score.html
- [ ] case-study-ecoclean.html
- [ ] vhairsalonbondi.html
- [ ] oneanothercafe.html
- [ ] electrician.html
- [ ] trades-lead-gen.html
- [ ] real-estate-web-design.html
- [ ] medical-booking-system.html
- [ ] legal-intake-system.html
- [ ] centaur-index.html
- [ ] industry-template.html


## 4. Gyors csere terminálból (opcionális)

Ha git repo-ban dolgozol, ezt a sed parancsot használhatod
az összes fájl egyszerre módosításához:

```bash
# Töröld a Google Fonts sorokat
find . -name "*.html" -exec sed -i '
  /rel="preconnect" href="https:\/\/fonts.googleapis.com"/d
  /rel="preconnect" href="https:\/\/fonts.gstatic.com"/d
  /fonts.googleapis.com\/css2/d
' {} \;

# Add hozzá az új font betöltést (az első <link> tag elé szúrja be)
find . -name "*.html" -exec sed -i '
  0,/<link/{
    s|<link|<!-- Self-hosted fonts -->\n    <link rel="stylesheet" href="/fonts/fonts.css">\n    <link rel="preload" href="/fonts/syne-latin.woff2" as="font" type="font/woff2" crossorigin>\n    <link rel="preload" href="/fonts/space-mono-400-latin.woff2" as="font" type="font/woff2" crossorigin>\n    <link|
  }
' {} \;
```


## 5. Commit & Push

```bash
git add fonts/ 
git add *.html
git commit -m "perf: self-host fonts, remove Google Fonts dependency"
git push
```


## 6. Cloudflare cache ürítés

Cloudflare Dashboard → Caching → Purge Everything

Vagy célzottan:
- Purge URL: https://australianweb.agency/fonts/fonts.css


## 7. Ellenőrzés

Teszt után ezeket kell látnod:
- [x] Fontok betöltenek (vizuálisan ugyanúgy néz ki)
- [x] DevTools → Network: nincs kérés fonts.googleapis.com felé
- [x] DevTools → Network: /fonts/*.woff2 fájlok 200-as választ adnak
- [x] PageSpeed: "Eliminate render-blocking resources" javult
- [x] PageSpeed: nincs preconnect figyelmeztetés


## Mi változik SEO/teljesítmény szempontból?

| Szempont                    | Előtte (Google Fonts)  | Utána (self-hosted)   |
|-----------------------------|------------------------|-----------------------|
| DNS lookup                  | 2 extra domain         | 0 extra domain        |
| TCP/TLS handshake           | 2x (googleapis + gstatic) | 0x                |
| Render-blocking request     | 1 (CSS letöltés)       | 0 (preload + inline)  |
| FOUT/FOIT kockázat          | Magasabb               | Minimális             |
| Third-party dependency      | Google szerverek       | Saját CDN (Cloudflare)|
| Privacy                     | Google tracking pixel  | Nincs tracking        |
| Becsült sebesség nyereség   | —                      | 200-400ms             |
