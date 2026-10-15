# Bratislava Urban Data Explorer

Vzdelávací a portfóliový projekt zameraný na mestské dáta Bratislavy.
Cieľom je postupne vytvoriť interaktívnu aplikáciu o brownfieldoch a vedieť
vysvetliť celý tok od zdrojových dát cez API až po používateľské rozhranie.
Nie je to oficiálna aplikácia Metropolitného inštitútu Bratislavy.

## Aktuálny rozsah

- FastAPI backend s `GET /api/health`, ktorý vracia `{"status":"ok"}`.
- Responzívna mapová stránka v Reacte a TypeScripte s vývojovým nástrojom Vite.
- Frontend overuje dostupnosť backendu cez Vite proxy; oba procesy sa spúšťajú samostatne.
- Interaktívna mapa Bratislavy s podkladom OpenStreetMap a reálnou vrstvou brownfieldov 2022.
- `GET /api/brownfields` poskytuje poslednú validovanú lokálnu GeoJSON snímku.
- Výber polygónu alebo názvu lokality, zvýraznenie, detail a priblíženie.
- Bez databázy. Aktuálne overenie importu 15. 10. 2026: 113 lokalít; počet nie je pevne predpísaný.

## Štruktúra

```text
portfolio/
├── .gitignore                 # Súbory, ktoré Git nemá sledovať
├── README.md                  # Tento návod
├── backend/
│   ├── .venv/                 # Lokálny Python a balíčky (mimo Gitu)
│   ├── app/
│   │   ├── __init__.py        # Označenie Python balíčka
│   │   ├── main.py            # FastAPI health a GIS endpointy
│   │   └── brownfields.py     # Validácia, kontrolný súčet, posledná platná snímka
│   ├── scripts/import_brownfields.py  # Ručne spúšťaný reprodukovateľný import
│   ├── tests/test_brownfields.py     # Syntetické unit a ASGI API testy
│   ├── data/                  # Ignorované lokálne GeoJSON a manifest súbory
│   ├── requirements.in        # Zoznam priamych závislostí
│   └── requirements.txt       # Presné verzie všetkých Python závislostí
└── frontend/
    ├── src/
    │   ├── main.tsx           # Pripojí React k HTML elementu root
    │   ├── api/health.ts      # HTTP požiadavka a overenie odpovede backendu
    │   ├── api/brownfields.ts # Typy a kontrola GIS odpovede
    │   ├── hooks/useBrownfields.ts   # Načítanie a chybové stavy
    │   ├── components/
    │   │   ├── CityMap.tsx           # Mapa, podklad, ovládanie a stav dlaždíc
    │   │   ├── CityMap.css           # Rozloženie a štýly mapy
    │   │   ├── BrownfieldPanel.tsx   # Stav dát, výber, atribúty, zdroj a ovládanie
    │   │   ├── BrownfieldsLayer.tsx  # GeoJSON polygóny a React výber
    │   │   └── BackendStatus.tsx     # Zachovaná kontrola FastAPI pripojenia
    │   ├── App.tsx            # Obsah úvodnej stránky
    │   ├── App.css            # Štýly úvodnej stránky
    │   └── index.css          # Základné štýly dokumentu
    ├── index.html             # HTML vstup, jazyk a titulok stránky
    ├── package.json           # Závislosti a príkazy npm
    ├── package-lock.json      # Presné verzie Node.js závislostí
    ├── vite.config.ts         # React plugin a adresa vývojového servera
    ├── .oxlintrc.json         # Pravidlá kontroly kódu (lint)
    ├── tsconfig*.json         # Nastavenia TypeScriptu
    ├── node_modules/          # Nainštalované balíčky (mimo Gitu)
    └── dist/                  # Výsledok zostavenia (mimo Gitu)
```

## Spustenie vo Windows PowerShell

Závislosti už sú nainštalované. Otvor **dve okná PowerShellu**.
Používame priamo Python z `.venv`, takže netreba aktivovať prostredie
ani meniť `ExecutionPolicy`. `npm.cmd` spúšťa npm bez PowerShell skriptu.

### 1. Backend – prvé okno

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\backend'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Health endpoint: <http://127.0.0.1:8000/api/health>
- Interaktívna dokumentácia API: <http://127.0.0.1:8000/docs>
- Očakávaná odpoveď endpointu: `{"status":"ok"}`.

Uvicorn je server, ktorý prijme HTTP požiadavku a odovzdá ju FastAPI.
Zápis `app.main:app` znamená objekt `app` zo súboru `app/main.py`.
Prepínač `--reload` reštartuje backend pri zmene kódu počas vývoja.
Samotná adresa `/` zatiaľ nemá endpoint a vráti 404; použi `/api/health`.

### 2. Frontend – druhé okno

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\frontend'
npm.cmd run dev
```

Otvor <http://127.0.0.1:5173>. Vite automaticky obnovuje stránku pri úprave kódu.
Oba servery zastavíš pomocou `Ctrl+C` v príslušnom okne.
Ak je port obsadený, najprv zastav vlastný predchádzajúci server.
Vite má `strictPort`, preto pri konflikte nezmení adresu potichu.

## Import a obnovenie lokálnej dátovej snímky

Pred prvým spustením na inom počítači alebo pri vedomej aktualizácii dát:

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\backend'
.\.venv\Scripts\python.exe -m scripts.import_brownfields
```

Skript potrebuje internet a nemá nové knižničné závislosti. Používa iba štandardný
Python a verejnú [ArcGIS vrstvu 8](https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8).
Je to evidencia **2022**, nie overenie aktuálneho stavu v roku 2026.
Vrstvy významných brownfieldov a transformačných území sa neimportujú.

Import načíta schému, aktuálny count a úplný zoznam OBJECTID. Podľa ID získa
všetky prvky v dávkach najviac 500 (najviac do limitu služby), s `f=geojson`
a `outSR=4326`. Vyberá explicitne iba potrebné atribúty, nie vlastnícke mená
či interné cesty. Prázdne popisné hodnoty a malé výmery nevyraďuje.
Overuje HTTP/ArcGIS chyby, FeatureCollection, jedinečné OBJECTID, zhodu ID a počtu,
Polygon/MultiPolygon, konečné súradnice, uzavretie a nedegenerovanosť kruhov.
Regionálny ochranný rámec `[16.8, 47.9, 17.4, 48.4]` v poradí západ/juh/východ/sever
je veľkorysá technická kontrola, nie administratívna hranica Bratislavy.
Samoprieseky a úplná topológia tým nie sú overené.

Na konci znova overí count a editovacie metadáta zdroja. Pri zmene počas importu
skončí chybou. Číslo 113 zo správy slúži iba ako porovnávací údaj: odlišný platný
počet sa zaznamená do manifestu, neodmietne sa automaticky. Záznamy sa triedia
podľa OBJECTID, aby bola serializácia opakovateľná pre rovnaký obsah.

Vzniknú dva **ignorované lokálne súbory**:

- `backend/data/brownfields_2022.geojson` – validovaná snímka.
- `backend/data/brownfields_2022.manifest.json` – URL a dotazy, názov vrstvy,
  edícia, čas stiahnutia UTC, počet a rozdiely oproti výskumu/predchádzajúcej snímke,
  výber polí, zdrojový súradnicový systém, editovacie metadáta a SHA-256 presných bajtov snímky.

Zápis každého súboru používa dočasný súbor a atómové nahradenie. Pri bežnej chybe
zápisu sa obnoví predchádzajúca dvojica. Nejde o databázovú transakciu odolnú voči
výpadku elektriny; backend nikdy nepodá dvojicu s nezhodným SHA-256. Importy
spúšťaj po jednom. Neúspešná sieťová či validačná kontrola nemení existujúce dáta.

### Licenčné obmedzenie a pôvod

Podmienky redistribúcie datasetu nie sú jednoznačne potvrdené: Experience uvádza
CC BY 4.0, ale service item má prázdne `licenseInfo`. Skript ho pri každom importe
zaznamená do manifestu a ponecháva stav **local use only / redistribution unconfirmed**.
Snímku ani manifest necommituj, nenahrávaj na GitHub a nezverejňuj verejný endpoint
s týmito dátami, kým vydavateľ podmienky nevyjasní. Lokálne uloženie pre tento
projekt nie je tvrdením o povolení ďalšej distribúcie. Zdroj a zistenia sú v
[technickom prieskume](docs/gis-data-research.md).

## Ako komunikuje frontend s backendom

```text
Prehliadač → http://127.0.0.1:5173/api/health
           → Vite proxy → http://127.0.0.1:8000/api/health
           ← Vite proxy ← FastAPI: {"status":"ok"}
```

Pri otvorení stránky React spustí kontrolu cez `useEffect`. Funkcia `getHealth`
v `src/api/health.ts` používa vstavaný `fetch` a relatívnu URL `/api/health`.
Vite podľa `server.proxy` prepošle požiadavky začínajúce `/api` na port 8000.
Cesta `/api/health` sa zachová. Prehliadač komunikuje so svojím pôvodným serverom
na porte 5173, preto pre tento vývojový postup netreba nastavovať CORS vo FastAPI.

Na stránke sú tri možné stavy:

- **Pripája sa**: kontrola ešte prebieha.
- **Pripojené**: prišla úspešná HTTP odpoveď s JSON objektom `{"status":"ok"}`.
- **Nedostupné**: nastala sieťová chyba, neúspešná HTTP odpoveď, nesprávny JSON
  alebo backend neodpovedal do piatich sekúnd. Úvodná stránka ostáva funkčná.

Odpoveď zo siete sa overuje aj za behu; samotný TypeScript nezaručuje jej obsah.
Pri odpojení komponentu sa požiadavka zruší a jej výsledok už nemení stav stránky.
Vývojový React StrictMode môže spustiť kontrolu dvakrát; prvá sa pri cleanup zruší.
Kontrola prebehne pri načítaní stránky, nejde o priebežný monitoring.
Po zapnutí alebo vypnutí backendu obnov stránku, aby sa stav skontroloval znova.

Proxy je nastavené pre vývojový server `npm.cmd run dev`. Samotný obsah `dist/`
neobsahuje proxy server; pri budúcom nasadení bude treba presmerovanie `/api`
nastaviť na serveri, ktorý aplikáciu obsluhuje.

Pre mapové dáta platí tok:

```text
Ručný import → verejný ArcGIS → validácia → lokálny GeoJSON + manifest
Prehliadač → Vite /api/brownfields → FastAPI → overená lokálna snímka
          ← GeoJSON ←             ←
```

Endpoint **nekontaktuje ArcGIS**. `SnapshotStore` kontroluje manifest, SHA-256
a geometriu a drží poslednú platnú kópiu v pamäti. Pri zmene súborov skúsi načítať
novú validovanú dvojicu; ak nie je platná, ponechá už načítanú poslednú platnú kópiu.
Ak žiadna platná kópia nie je dostupná, vráti **HTTP 503** s návodom na import.
GeoJSON odpoveď má `Content-Type: application/geo+json`, ETag podľa SHA-256,
`X-Data-Edition: 2022` a `X-Feature-Count`.

`getBrownfields` kontroluje HTTP odpoveď a základnú štruktúru a typy dát.
`useBrownfields` rieši načítavanie, chybu, cleanup požiadavky a 15-sekundový timeout.
Prázdny validný dataset je samostatný stav. Po obnovení snímky obnov stránku.
`App` drží selected OBJECTID a požiadavku na priblíženie v React stave.
`BrownfieldsLayer` používa Leaflet `GeoJSON`, dynamický štýl a `fitBounds`;
Polygon aj MultiPolygon sa spracujú bez ručného prehadzovania súradníc.
`BrownfieldPanel` poskytuje detail, priblíženie, zrušenie výberu a klávesnicou
ovládateľný zoznam všetkých lokalít. Polygóny možno aktivovať aj Enter/medzerníkom.
Chýbajúce hodnoty sa zobrazujú ako **Neuvedené** a texty zdroja sa nevkladajú ako HTML.

### Manuálne overenie proxy

Pri bežiacom backende aj frontende:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:5173/api/health'
```

Očakávaný `status` je `ok` a stránka zobrazí **Pripojené**.
Zastav backend cez `Ctrl+C`, obnov stránku a over **Nedostupné**.
Vite môže v termináli vypísať chybu proxy pri vypnutom backende; je to očakávané.

## Mapa Bratislavy

Nainštalované stabilné verzie:

| Knižnica | Verzia | Úloha |
| --- | --- | --- |
| React / React DOM | 19.3.1 | Existujúce používateľské rozhranie |
| Leaflet | 1.9.4 | Mapový engine: dlaždice, posúvanie, zoom a ovládanie |
| React Leaflet | 5.0.0 | Prepojenie Leaflet mapy s React komponentmi |
| @types/leaflet | 1.9.22 | TypeScript definície pre Leaflet, vývojová závislosť |

React Leaflet 5.0.0 požaduje `react` a `react-dom` vo verzii `^19.0.0`
a `leaflet` vo verzii `^1.9.0`; nainštalované verzie tieto požiadavky spĺňajú.
React Leaflet obsahuje vlastné typy. Nové mapové závislosti sú uložené s presnými
verziami v `package.json` a uzamknuté v `package-lock.json`.
Inštalácia nepoužila `--force` ani `--legacy-peer-deps`.

`CityMap` vytvára `MapContainer` s počiatočným stredom `[48.1486, 17.1077]`
a zoomom `13`, čo pokrýva širšie centrum Bratislavy. `TileLayer` načítava podklad.
Tlačidlá + / −, koliesko, dvojklik, dotykové gestá a ťahanie ovládajú mapu.
Tlačidlo **Späť na Bratislavu** obnoví pôvodný stred aj priblíženie.
Klávesnicou možno po zameraní mapy používať šípky a + / −.
`MapTools` používa `useMap` a `ResizeObserver`, aby mapa reagovala aj na zmenu
veľkosti panelu. `CityMap.tsx` importuje potrebné Leaflet štýly aj vlastné `CityMap.css`.

`CityMap` prijíma voliteľné `children`: sem bude možné neskôr vložiť React Leaflet
`GeoJSON` vrstvu po overení zdroja a súradnicového systému dát MIB ArcGIS.
Mapa obsahuje reálne polygóny importovanej vrstvy 8, bez vymyslených objektov.
`BrownfieldPanel` zobrazuje vybranú lokalitu. Na úzkych obrazovkách sa panel presunie pod mapu.
`BackendStatus` uchováva pôvodnú logiku pripojenia vrátane päťsekundového timeoutu.
Samotný mapový podklad funguje nezávisle od FastAPI.

### OpenStreetMap a sieťové obmedzenia

Používame HTTPS URL `https://tile.openstreetmap.org/{z}/{x}/{y}.png` a viditeľnú
atribúciu **© OpenStreetMap contributors** s odkazom na autorské práva.
Dlaždice načítava priamo prehliadač, ktorý spravuje User-Agent a HTTP cache.
HTML nastavuje `strict-origin-when-cross-origin`, aby požiadavky obsahovali Referer.
Nepridávame hlavičky obchádzajúce cache, hromadné sťahovanie ani offline režim.
`keepBuffer={0}` obmedzuje ponechávanie dlaždíc mimo aktuálneho pohľadu.
Súčasťou mapy je odkaz na hlásenie chýb podkladu.

Podklad vyžaduje internet. Pri chybe dlaždíc sa pod mapou zobrazí upozornenie;
skús obnoviť stránku po obnovení pripojenia. Dostupnosť verejného tile servera
nie je garantovaná. Pred väčším verejným nasadením treba znovu posúdiť poskytovateľa
a jeho pravidlá. [Aktuálna OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/).

### Overenie mapy

Spusti oba servery podľa návodu vyššie. Over načítanie Bratislavy, tlačidlá
priblíženia, posúvanie, návrat na mesto a viditeľnú atribúciu. Pri mobilnej šírke
má byť panel pod mapou a stránka bez vodorovného posúvania.
Po vypnutí backendu a obnovení stránky má mapa ostať funkčná a indikátor
zobraziť **Nedostupné**. Nerob automatizované prechody cez veľké územia ani zoomy
s cieľom prednačítať dlaždice.

## Obnovenie závislostí na tomto alebo inom počítači

Overené základné nástroje: Python 3.13.2, Node.js 22.14.0, npm 10.9.2 a Git 2.55.0.windows.2.
Na inom počítači prispôsob cesty umiestneniu projektu. Inštalácia vyžaduje internet.

Backend:

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\backend'
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Frontend:

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\frontend'
npm.cmd ci
```

`requirements.txt` a `package-lock.json` uchovávajú konkrétne verzie balíčkov.
`requirements.in` vysvetľuje, ktoré Python balíčky projekt používa priamo.
Virtuálne prostredie ani `node_modules` sa nekopírujú do Gitu.

## Kontroly

Backend – kontrola závislostí a syntaxe:

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\backend'
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m compileall -q app
```

Pri bežiacom backende skontroluj v ďalšom PowerShell okne HTTP odpoveď:

```powershell
$response = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/api/health' -UseBasicParsing
$response.StatusCode
$response.Content
if ($response.StatusCode -ne 200 -or $response.Content -cne '{"status":"ok"}') {
    throw 'Health endpoint nevrátil očakávanú odpoveď.'
}
```

Frontend – kontrola kódu a produkčné zostavenie:

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\frontend'
npm.cmd run lint
npm.cmd run build
```

`lint` používa Oxlint dodaný Vite šablónou. `build` najprv skontroluje TypeScript
a potom vytvorí statické súbory v `dist/`. Nie je to nasadenie na internet.
Backendové testy bez nových závislostí:

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\backend'
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Testy používajú výlučne malé syntetické príklady označené `TEST_ONLY`, dočasné
súbory a mockované sieťové odpovede. Nejde o skutočné brownfieldy a testovacie
objekty sa neukladajú do dátovej snímky. API sa testuje cez skutočné ASGI volanie
FastAPI bez ďalšej HTTP testovacej knižnice. Pokryté sú count/ID, dávky, null
atribúty, geometria, HTTP a ArcGIS chyby, zmena zdroja, SHA-256, rollback zápisu,
poškodená/chýbajúca snímka, obnova manifestu, posledná platná kópia a health endpoint.

Pri bežiacom backende a Vite:

```powershell
$data = Invoke-RestMethod 'http://127.0.0.1:5173/api/brownfields'
$data.type
$data.features.Count
```

Pri overení 15. 10. 2026: `FeatureCollection`, 113 prvkov a platný SHA-256.

## Git a citlivé údaje

Lokálny Git repozitár obsahuje prvý commit `chore: initialize full-stack project`.
Stav skontroluješ z koreňa projektu príkazom `git status`.
`.gitignore` vylučuje virtuálne prostredia, balíčky, buildy, logy,
súbory `.env`, priečinky `secrets/` a bežné formáty súkromných kľúčov.
Výnimka `.env.example` slúži iba na príklady bez skutočných hesiel.
Pred commitom vždy skontroluj obsah súborov; `.gitignore` nie je detektor secrets.

## Dokumentácia technológií

- [FastAPI – prvé kroky](https://fastapi.tiangolo.com/tutorial/first-steps/)
- [Vite – úvod a príkazy](https://vite.dev/guide/)
- [React Leaflet – inštalácia a typy](https://react-leaflet.js.org/docs/start-installation/)
- [Leaflet – dokumentácia](https://leafletjs.com/reference.html)
