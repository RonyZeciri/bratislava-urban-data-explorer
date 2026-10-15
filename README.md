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
- Bezpečná konfigurácia produkcie: HTTPS API adresa, presné CORS a predvolene zakázaná snímka; GIS režimy `local-api`, `disabled`, lokálne technické overenie `arcgis`.
- Výber polygónu alebo názvu lokality, zvýraznenie, detail a priblíženie.
- Analytický panel: vyhľadávanie, rozsah výmery, triedenie a súhrny synchronizované s mapou.
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
│   │   ├── config.py          # APP_ENV, JSON originy a bezpečný boolean
│   │   └── brownfields.py     # Validácia, kontrolný súčet, posledná platná snímka
│   ├── scripts/import_brownfields.py  # Ručne spúšťaný reprodukovateľný import
│   ├── tests/test_brownfields.py     # Syntetické unit a ASGI API testy
│   ├── tests/test_config.py          # Parsovanie, produkčný zákaz a CORS
│   ├── data/                  # Ignorované lokálne GeoJSON a manifest súbory
│   ├── requirements.in        # Zoznam priamych závislostí
│   └── requirements.txt       # Presné verzie všetkých Python závislostí
└── frontend/
    ├── src/
    │   ├── main.tsx           # Pripojí React k HTML elementu root
    │   ├── config/            # Typy, validácia a spoločná konfigurácia API a GIS
    │   ├── api/health.ts      # HTTP požiadavka a overenie odpovede backendu
    │   ├── api/brownfields.ts # Typy a kontrola GIS odpovede
    │   ├── api/brownfieldData.ts # Spoločné typy a základná validácia oboch zdrojov
    │   ├── api/arcgis.ts      # Pevný ArcGIS klient, dávky, timeouty, limity a retry
    │   ├── api/validateArcgis.ts # Schéma, ID, úplnosť a prísna kontrola geometrie
    │   ├── api/sharedLoad.ts  # Jedno zdieľané načítanie iba v pamäti stránky
    │   ├── api/abort.ts       # Zrušiteľné čakanie vrátane čítania odpovede
    │   ├── hooks/useBrownfields.ts   # Načítanie a chybové stavy
    │   ├── domain/brownfieldAnalytics.ts # Čisté funkcie filtrov, triedenia a súčtov
    │   ├── components/
    │   │   ├── AnalyticsPanel.tsx    # Filtre, štatistiky a metodika (+ vlastné CSS)
    │   │   ├── CityMap.tsx           # Mapa, podklad, ovládanie a stav dlaždíc
    │   │   ├── CityMap.css           # Rozloženie a štýly mapy
    │   │   ├── BrownfieldPanel.tsx   # Stav dát, výber, atribúty, zdroj a ovládanie
    │   │   ├── BrownfieldsLayer.tsx  # GeoJSON polygóny a React výber
    │   │   ├── RetryButton.tsx       # Opakovanie s rešpektovaním Retry-After
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
    ├── tests/brownfieldAnalytics.test.ts # TEST_ONLY syntetické testy analytiky
    ├── tests/config.test.ts    # Konfigurácia a neprítomnosť GIS volaní
    ├── tests/arcgis.test.ts    # Syntetický transport, validácia a zdieľanie exportu
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

## Konfigurácia development a production

Frontend konfiguráciu spracúva `src/config/parseConfig.ts`, používa ju Vite aj
prehliadač. Neplatná hodnota zastaví dev server/build so zrozumiteľnou chybou.
Backend `app/config.py` číta premenné procesu pri štarte; neplatná konfigurácia
zastaví štart, nepoužije tichý fallback. Po zmene backendových premenných treba
server spustiť znova v procese s novým prostredím.

| Premenná | Development bez nastavenia | Production | Pravidlo |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Prázdna, požiadavky `/api` cez Vite proxy | Povinný HTTPS origin backendu | Absolútna URL bez cesty, query, fragmentu a prihlasovacích údajov; koncová lomka sa odstráni. Development povoľuje aj HTTP. |
| `VITE_GIS_SOURCE` | `local-api` | Iba `disabled` | Vo vývoji aj `arcgis` na loopback hoste; produkčný build odmietne oba aktívne režimy. Prázdna explicitná hodnota je chyba. |
| `APP_ENV` | `development` | Explicitne `production` | Iba tieto dve hodnoty; frontendové premenné túto hodnotu nenastavujú. |
| `SNAPSHOT_API_ENABLED` | `true` | **`false`, ak nie je nastavená** | Iba `true`/`false` (nezávisle od veľkosti písmen, okrajové medzery sa odstránia). `1`, `0`, `yes` a prázdna hodnota sú chyby. |
| `CORS_ALLOWED_ORIGINS` | `[]` | `[]`, kým nepridáš konkrétne originy | JSON zoznam reťazcov. V produkcii iba HTTPS, bez wildcard, hesla, cesty, query, fragmentu a koncovej lomky. Prázdny zoznam nedáva CORS povolenie žiadnemu cudziemu originu. |

Režimy GIS:

- **`local-api`** zachováva existujúci tok React → Vite proxy → FastAPI →
  validovaná lokálna snímka, mapu, filtre, výber aj štatistiky. Bez snímky dostane 503.
- **`disabled`** nevolá `/api/brownfields` ani ArcGIS. Zobrazí vysvetlenie a odkaz
  na oficiálnu ArcGIS aplikáciu MIB; filtre sú vypnuté a metriky majú pomlčky,
  nie zavádzajúce nulové počty.
- **`arcgis`** načíta vrstvu 8 priamo z oficiálneho ArcGIS REST API. Je určený
  iba na lokálne technické overenie na `localhost`, `127.0.0.1` alebo `[::1]`.
  Nepoužíva backendový GIS endpoint ani fallback na lokálnu snímku. Backendový
  health indikátor naďalej funguje samostatne; jeho výpadok neblokuje ArcGIS.

Kontrola `/api/health` a OSM podklad fungujú nezávisle od GIS režimu. `disabled`
preto neznamená úplný offline režim ani zákaz všetkej siete. Odkaz na oficiálnu
aplikáciu ju otvorí až po kliknutí; nevkladáme iframe ani prednačítanie.

Backendový prepínač je samostatná ochrana. Pri vypnutí endpoint vráti HTTP 503
s vysvetlením a `Cache-Control: no-store`, **pred čítaním súborov alebo poslednej
platnej kópie v pamäti**. Health zostáva 200. Explicitné `true` dokáže prekonať
produkčný predvolený stav; nezapínaj ho verejne bez potvrdených práv k dátam.
Priamy ArcGIS klient je implementovaný len pre lokálne overenie. Verejné nasadenie
nevzniklo a produkčné GIS zostáva zamknuté na `disabled` do vyjasnenia práv k dátam.

CORS povoľuje iba presne uvedené originy a GET, bez credentials a bez wildcard.
Development cez Vite proxy ho nepotrebuje. CORS nie je autentifikácia: GET
z nepovoleného originu môže server obslúžiť, ale nevráti povoľujúcu CORS hlavičku.
Preflight nepovoleného pôvodu/metódy/hlavičky je odmietnutý. CORS neudeľuje
licenciu na dáta ani nebráni ich čítaniu samostatným HTTP klientom.

### Bezpečné príklady súborov

- `frontend/.env.example` – voliteľný vzor pre `.env.local`, lokálny režim.
- `frontend/.env.production.example` – vzor pre `.env.production.local`, GIS vypnuté.
- `backend/.env.example` a `.env.production.example` – dokumentácia hodnôt;
  **Python tieto súbory automaticky nenačítava**. Nie je pridaná dotenv knižnica.
  Premenné nastav cez PowerShell alebo neskôr v hostingu.

Vite súbory `.example` automaticky nečíta. Skutočné `.env*` sú ignorované Gitom;
príklady sa môžu sledovať a neobsahujú secrets. Premenné procesu majú vo Vite
prednosť pred súbormi. Po ich zmene reštartuj Vite. `VITE_*` sú verejnou súčasťou
JavaScriptu vloženou **pri builde**, nikdy do nich nevkladaj token či heslo.
Zmena prostredia na hostingu už hotový bundle nezmení; treba nový build.

### Jednoznačný lokálny štart vo Windows PowerShell

Prvé okno, backend (aj po predchádzajúcom skúšaní produkčných premenných):

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\backend'
$env:APP_ENV = 'development'
$env:CORS_ALLOWED_ORIGINS = '[]'
$env:SNAPSHOT_API_ENABLED = 'true'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Druhé okno, frontend:

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\frontend'
$env:VITE_API_BASE_URL = ''
$env:VITE_GIS_SOURCE = 'local-api'
npm.cmd run dev
```

Otvor `http://127.0.0.1:5173`. Ak máš vo vlastnom `.env.local` nastavený absolútny
API base, vymaž tú hodnotu alebo ju nechaj prázdnu, aby sa použila Vite proxy.
Príkazy `$env:` menia iba aktuálny PowerShell a jeho potomkov, nie systémové nastavenia.

### Produkčný build bez publikovania

Aj pri vypnutom GIS potrebuje health klient platný HTTPS API origin. Nasledujúca
adresa je **iba dokumentačný príklad**, nie existujúci backend projektu:

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\frontend'
$env:VITE_API_BASE_URL = 'https://backend.example.com'
$env:VITE_GIS_SOURCE = 'disabled'
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Build skončí chybou, ak produkčná API adresa chýba, používa HTTP alebo má neplatný
tvar. Build tiež odmietne prepisovanie `NODE_ENV` na inú hodnotu než `production`,
aby sa vývojové predvolené hodnoty nedostali do produkčného balíka.
Pred budúcim nasadením nahraď príklad skutočnou HTTPS adresou a zostav znova.
`npm.cmd run preview` slúži iba na lokálnu kontrolu hotového buildu; pri príkladovej
adrese sa health nepripojí. Nie je to produkčný server a nič tým nenasadzuješ.

Produkčné nastavenie backendu možno bezpečne skúsiť lokálne na inom porte:

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\backend'
$env:APP_ENV = 'production'
$env:CORS_ALLOWED_ORIGINS = '["https://frontend.example.com"]'
$env:SNAPSHOT_API_ENABLED = 'false'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

`http://127.0.0.1:8001/api/health` vráti 200 a `/api/brownfields` vráti 503 aj
pri existujúcej lokálnej snímke. Ide o lokálny HTTP test produkčnej konfigurácie,
nie simuláciu HTTPS certifikátu. Pri budúcom hostingu HTTPS ukončí platforma;
presné CORS originy nahradia dokumentačné príklady. Nepoužívaj `--reload` verejne.

### Lokálne technické overenie priameho ArcGIS režimu

Zastav iba svoj predchádzajúci frontend cez `Ctrl+C` alebo použi voľný port.
Z koreňa projektu v samostatnom PowerShell okne:

```powershell
Set-Location 'C:\Users\ronyz\Desktop\CODEX\portfolio\frontend'
$env:VITE_API_BASE_URL = ''
$env:VITE_GIS_SOURCE = 'arcgis'
npm.cmd run dev -- --port 5175
```

Otvor `http://127.0.0.1:5175`. Backend netreba na GIS; na health indikátor môže
ďalej bežať na porte 8000. Pred návratom do bežného vývoja zastav tento server,
nastav `$env:VITE_GIS_SOURCE = 'local-api'` a spusti `npm.cmd run dev`.
Nevytvárame trvalý `.env.local` prepínajúci projekt do ArcGIS režimu.

Tok je prehliadač → metadáta vrstvy → count → ID → sekvenčné GeoJSON dávky →
kontrola celku → záverečný count/metadáta → spoločný React stav → mapa/filter/analytika.
Nie je to proxy ani import do súboru. Export používa pevný endpoint, presné
overené polia, `objectIds`, `outSR=4326`, `f=geojson` a dávky najviac 500.
Pri dnešných 113 objektoch ide o šesť logických požiadaviek, jednu z nich na geometriu.
Číslo 113 nie je validačná konštanta. [REST Query dokumentácia](https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/).

Limity klienta: 15 s na požiadavku vrátane tela, 60 s na celé načítanie,
25 MB na odpoveď, 50 MB súhrnne pre načítanie vrátane opakovaných úspešných tiel,
10 000 objektov a 50 dávok. Sú to naše ochranné limity, nie kvóta ArcGIS.
HTTP 429/5xx a sieťová chyba majú najviac jedno opakovanie s odstupom a jitterom;
`Retry-After` sa rešpektuje, pokiaľ ho prehliadač smie čítať. Dlhé čakanie sa
neprespáva automaticky, tlačidlo **Opakovať** zostane dočasne vypnuté. Časový limit
ani validácia nespúšťajú nekonečný retry. Oprávnenia sa neobchádzajú.

Metadáta, count, množina ID, typy atribútov, úplnosť dávok a Polygon/MultiPolygon
sa overujú pred zobrazením. Kruhy musia byť uzavreté a nedegenerované, súradnice
konečné a v rovnakom veľkorysom regionálnom rámci ako backend. Pri zmene zdroja
počas čítania alebo neúplnosti sa žiadna čiastočná vrstva nevydáva za kompletnú.
Null popisy a nulová výmera sa nevyraďujú. Význam výmery zostáva podľa metodiky nižšie.

Export je zdieľaný v pamäti jednej otvorenej stránky vrátane StrictMode cleanup/remount.
Po odchode posledného odberateľa sa nedokončený export zruší s krátkym odkladom
na okamžité opätovné pripojenie. Úspešný výsledok zostáva iba v pamäti do zatvorenia
alebo obnovenia stránky; filtrovanie a výber ďalšie požiadavky nevytvárajú.
ArcGIS fetch používa `cache: no-store` a `credentials: omit`. Žiadny localStorage,
IndexedDB, service worker, GeoJSON súbor ani nová snímka na disku.

Panel zobrazuje **edíciu 2022** samostatne od aktuálneho dátumu/času úspešného
získania z ArcGIS. Čas získania nie je dátum terénneho prieskumu. Lokálny režim
odkazuje na dátum stiahnutia v existujúcom manifeste, nevymýšľa nový dátum snímky.
Pri chybe je dostupné vysvetlenie, **Opakovať** a odkaz na oficiálnu Experience;
prázdny validný dataset je odlišný stav. Neexistuje trvalá offline záloha ArcGIS režimu.

Overenie 15. 10. 2026: priamo v prehliadači načítaných 113 prvkov/113 polygónov,
579,75 ha; rozsah 1–10 ha zobrazil zhodne 62 prvkov v zozname aj na mape a 174,32 ha.
Neuložila sa nová dátová kópia. Lokálny režim aj disabled boli vizuálne overené.
Podrobnosti implementácie a obmedzenia: [dátové režimy](docs/data-modes.md).

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
`useBrownfields` rieši načítavanie, chybu, cleanup a opakovanie. Local-api používa
15-sekundový timeout; ArcGIS má vlastné limity a zdieľané načítanie popísané vyššie.
Prázdny validný dataset je samostatný stav. Po obnovení snímky obnov stránku.
`App` drží selected OBJECTID a požiadavku na priblíženie v React stave.
`BrownfieldsLayer` používa Leaflet `GeoJSON`, dynamický štýl a `fitBounds`;
Polygon aj MultiPolygon sa spracujú bez ručného prehadzovania súradníc.
`BrownfieldPanel` poskytuje detail, priblíženie, zrušenie výberu a klávesnicou
ovládateľný zoznam vyfiltrovaných lokalít. Polygóny možno aktivovať aj Enter/medzerníkom.
Chýbajúce hodnoty sa zobrazujú ako **Neuvedené** a texty zdroja sa nevkladajú ako HTML.

## Analytický panel nad evidenciou 2022

Panel používa iba údaje už načítané cez `useBrownfields`. Zmena filtrov ani
triedenia nevytvára ďalšie API požiadavky. Backend a import zostávajú nezmenené.
Typy a jednotky polí sú doložené v [prieskume zdroja](docs/gis-data-research.md)
a v [metadátach vrstvy 8](https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8?f=pjson).

| Zdrojové pole | Typ ArcGIS | Použitie |
| --- | --- | --- |
| `NAZOV` | String | Názov lokality, textové vyhľadávanie a slovenské abecedné triedenie |
| `SPEC_CISLO` | Integer | Evidenčné číslo, presná zhoda pri číselnom vyhľadávaní |
| `OBJECTID` | OID | Jedinečný identifikátor prvku, presná zhoda a synchronizácia výberu |
| `VYMERA_HA` | Double | Evidovaná výmera v hektároch; filter, triedenie a súčty |

Vyhľadávanie názvu nerozlišuje veľké písmená ani diakritiku a hľadá časť názvu.
Čisto číselný dopyt porovnáva presne s `SPEC_CISLO` **alebo** `OBJECTID`;
obe polia môžu označiť rôzne záznamy. Rozsah výmery má vrátane obe hranice,
prijíma desatinnú čiarku aj bodku. Bez hraníc sa zachovajú aj neznáme výmery;
pri aktívnej hranici musia mať výsledky známu výmeru. Záporné, nečíselné hranice
a minimum väčšie než maximum zobrazia chybu, výsledkové metriky majú pomlčku.

Triedenie názvu aj výmery funguje oboma smermi. Chýbajúce hodnoty sú vždy na konci;
zhody sa rozhodnú názvom a následne `OBJECTID`. **Resetovať filtre** obnoví prázdne
vyhľadávanie, neobmedzenú výmeru a názov A → Z. `App` odovzdáva rovnaké výsledky
panelu aj mape. Keď filter skryje vybranú lokalitu, výber aj detail sa zrušia.
Pri zmene množiny výsledkov sa obnoví iba GeoJSON vrstva (React Leaflet jej dáta
nemení za behu), samotná mapa si zachová pohľad. Triedenie nemení členstvo vrstvy.

### Metodika štatistík

- **Všetky lokality:** počet GeoJSON prvkov v načítanej validovanej snímke vrstvy 8.
- **Vyhovuje filtrom:** počet prvkov po spoločnom vyhľadávaní a filtrovaní;
  presne táto množina sa zobrazuje v zozname a na mape. Triedenie počet nemení.
- **Súčet výmer všetkých lokalít:** súčet konečných nezáporných čísel `VYMERA_HA`
  v celej snímke. Nula je platná hodnota, null a neplatné čísla nie sú nula.
- **Súčet výmer výsledkov:** rovnaký výpočet iba nad výsledkami filtrov.
  Obe výmery uvádzajú počet známych a chýbajúcich/neplatných hodnôt.
  Neprázdna množina bez známych výmer má „Neuvedené“; prázdna množina má 0 ha.

Sčítavajú sa pôvodné hodnoty bez priebežného zaokrúhľovania; až zobrazenie je
zaokrúhlené najviac na dve desatinné miesta. Nejde o výpočet z geometrie,
zjednotenie plôch ani odpočítanie prekryvov. Ide výlučne o evidované brownfieldy
**2022**, nie o aktuálny stav v roku 2026 ani celkovú výmeru transformačných území.
Metodika je dostupná aj priamo v rozbaľovacom vysvetlení panelu.

Lokálna snímka overená 15. 10. 2026 obsahuje **113** prvkov, všetky so známou
výmerou; súčet `VYMERA_HA` je **579,752169443674 ha**, zobrazenie **579,75 ha**.
Tieto hodnoty nie sú konštanty aplikácie a po vedomom obnovení snímky sa prepočítajú.
Licenčné obmedzenie lokálnej snímky uvedené vyššie zostáva v platnosti.

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
npm.cmd test
$env:VITE_API_BASE_URL = 'https://backend.example.com' # Priklad iba pre kontrolu buildu
$env:VITE_GIS_SOURCE = 'disabled'
npm.cmd run build
```

`lint` používa Oxlint dodaný Vite šablónou. `build` najprv skontroluje TypeScript
a potom vytvorí statické súbory v `dist/`. Nie je to nasadenie na internet.
`test` najprv typovo overí testy cez `tsconfig.tests.json` a potom použije vstavaný
Node.js test runner. Na Node.js 22.14 môže vypísať upozornenie ExperimentalWarning
pre odstraňovanie TypeScript typov; testy tým nezlyhávajú. Bez nových knižníc overuje
37 testov: diakritiku a ID, hranice a chyby filtrov, oba smery triedenia,
chýbajúce hodnoty, presnosť súčtu, nulové výsledky, reset a nemennosť vstupu.
Syntetické príklady sú označené `TEST_ONLY` a nevstupujú do aplikácie. Nové testy
overujú aj vývojové/produkčné predvolené hodnoty, HTTPS/API URL, neplatný GIS
režim, nulový počet volaní v disabled, samostatný ArcGIS loader bez fallbacku a
produkčný/loopback zákaz. ArcGIS testy mockujú všetky odpovede: dávky, schému,
count/ID, nulové/chýbajúce hodnoty, geometriu, HTTP/JSON chyby, autentifikáciu,
retry/Retry-After, veľkosť, timeout, zrušenie a StrictMode zdieľanie. Testy nevolajú živú službu.

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
Spolu 27 backendových testov zahŕňa aj parsovanie konfigurácie, produkčný zákaz
pred čítaním snímky, explicitný zákaz vo vývoji a CORS pre GET, preflight,
nepovolený origin/metódu/hlavičku a neprítomnosť credentials.

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
