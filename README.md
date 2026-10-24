# Bratislava Urban Data Explorer

Webová aplikácia na priestorové skúmanie brownfieldov Bratislavy. Prepája mapu,
zoznam lokalít a analytický panel, aby bolo možné vyhľadať územie, porovnať jeho
výmeru a prezrieť si evidované atribúty v jednom rozhraní. Používa React,
TypeScript a React Leaflet na frontende a Python FastAPI na backende.

Pracuje s **historickou evidenciou 2022** zo zdroja MIB / ArcGIS, nie s aktuálnym
stavom využívania pozemkov. Nie je oficiálnou aplikáciou MIB.

## Hlavné funkcie

- Interaktívna mapa Bratislavy s OpenStreetMap a polygónmi Polygon/MultiPolygon.
- Výber lokality na mape alebo v zozname, zvýraznenie, detail a priblíženie.
- Vyhľadávanie podľa názvu bez rozlišovania diakritiky alebo podľa identifikátora.
- Filtrovanie podľa výmery v hektároch, triedenie podľa názvu a výmery, reset filtrov.
- Počty lokalít a súčty výmer synchronizované so zoznamom a mapou.
- Stavy načítavania, chýbajúcich údajov a výpadkov, opakovanie GIS požiadavky.
- Responzívne rozloženie, klávesnicové ovládanie a indikátor dostupnosti backendu.

## Technológie

| Oblasť | Technológie |
| --- | --- |
| Frontend | React 19, TypeScript 6, Vite 8 |
| Mapa | Leaflet 1.9.4, React Leaflet 5, OpenStreetMap |
| Backend | Python, FastAPI, Uvicorn |
| Údaje | ArcGIS REST API, GeoJSON vo WGS 84, lokálna snímka s SHA-256 manifestom |
| Kontroly | Python unittest, Node.js test runner, TypeScript, Oxlint |

Presné verzie závislostí určujú `backend/requirements.txt` a
`frontend/package-lock.json`. Aplikácia nepoužíva databázu.

## Architektúra

```text
React: mapa + zoznam + analytika
  ├─ /api/health → Vite proxy → FastAPI
  └─ GIS podľa zvoleného režimu:
       local-api → Vite proxy → FastAPI → GeoJSON + manifest na disku
       arcgis    → oficiálne ArcGIS REST API → pamäť stránky
       disabled  → bez GIS požiadaviek
```

Vite proxy preposiela `/api` na `http://127.0.0.1:8000`. Pri neprázdnom
`VITE_API_BASE_URL` používajú backendoví klienti tento origin priamo.
Dáta sú spoločné pre všetky komponenty; filtre ani výber nespúšťajú ďalšie sťahovanie.

```text
backend/
  app/          # Endpointy, konfigurácia, validácia a SnapshotStore
  scripts/      # Ručne spúšťaný import z ArcGIS
  data/         # GeoJSON snímka a zodpovedajúci manifest
  tests/        # Unit a ASGI API testy
frontend/
  src/api/      # API klienti, GeoJSON typy a validácia
  src/config/   # Typovaná konfigurácia
  src/hooks/    # Načítavanie a chybové stavy
  src/domain/   # Filtre, triedenie a štatistiky
  src/components/ # Mapa, analytický panel a detail
  tests/        # Syntetické testy a mock odpovede
docs/           # Podrobná technická dokumentácia
```

FastAPI poskytuje `GET /api/health` s odpoveďou `{"status":"ok"}` a
`GET /api/brownfields` s validovanou GeoJSON snímkou. GIS endpoint nekontaktuje
ArcGIS pri jednotlivých požiadavkách. Overuje manifest a SHA-256; pri neplatnej
obnove zachová poslednú platnú kópiu v pamäti. Bez platnej snímky alebo pri
zakázanom poskytovaní vráti HTTP 503.

## Inštalácia a spustenie

### Požiadavky

Návod používa Windows 11 a PowerShell. Potrebuješ Git, Python, Node.js s npm
a moderný prehliadač. Na inštaláciu a OSM podklad je potrebný internet.

- **Python 3.13** je vhodná voľba pre tento postup. Uzamknuté závislosti vyžadujú
  najmenej Python 3.11; projekt nemá vlastný deklarovaný rozsah `requires-python`.
- **Node.js 22 od verzie 22.12.0** podporuje nástroje aj testovací skript.
  Vite deklaruje `^20.19.0 || >=22.12.0`; samotný testovací skript navyše používa
  `--experimental-strip-types`.
- npm sa dodáva s Node.js; projekt neurčuje samostatnú minimálnu verziu npm ani Gitu.

### Prvá inštalácia

V PowerShelli otvor priečinok, v ktorom chceš vytvoriť nový klon:

```powershell
git clone https://github.com/RonyZeciri/bratislava-urban-data-explorer.git
Set-Location .\bratislava-urban-data-explorer
python -m venv .\backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r .\backend\requirements.txt
Set-Location .\frontend
$env:NODE_ENV = 'development'
npm.cmd ci
Set-Location ..
```

Tým vzniknú `backend/.venv` a `frontend/node_modules`. Python musí byť dostupný
ako `python`; pri Windows launcheri možno na vytvorenie prostredia použiť
`py -3.13 -m venv .\backend\.venv`. Ďalej používame jeho Python priamo, bez
aktivácie prostredia a bez zmeny `ExecutionPolicy`. `npm.cmd` obchádza `npm.ps1`.

### Lokálne spustenie s brownfieldmi

Režim `local-api` zobrazuje mapu, detaily aj analytiku z lokálnej snímky.
Vyžaduje oba súbory `backend/data/brownfields_2022.geojson` a
`backend/data/brownfields_2022.manifest.json`. V tejto revízii sú prítomné medzi
Gitom sledovanými súbormi; manifest uvádza 113 prvkov.

**Použi tento postup iba v rozsahu, na ktorý máš oprávnenie používať zdrojové
údaje. Práva na redistribúciu nie sú potvrdené; pozri [Dátové zdroje](#dátové-zdroje).**
Prítomnosť snímky v repozitári nie je potvrdením licencie.

Otvor dva terminály, každý **v koreňovom priečinku klonu**.

Prvý terminál – backend:

```powershell
Set-Location .\backend
$env:APP_ENV = 'development'
$env:CORS_ALLOWED_ORIGINS = '[]'
$env:SNAPSHOT_API_ENABLED = 'true'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Druhý terminál – frontend:

```powershell
Set-Location .\frontend
$env:NODE_ENV = 'development'
$env:VITE_API_BASE_URL = ''
$env:VITE_GIS_SOURCE = 'local-api'
npm.cmd run dev
```

Otvor [aplikáciu](http://127.0.0.1:5173/).
[Health endpoint](http://127.0.0.1:8000/api/health) overuje beh backendu;
[Swagger UI](http://127.0.0.1:8000/docs) opisuje API. Servery zastavíš cez `Ctrl+C`.
Pri ďalšom spustení zopakuj iba tieto dva bloky z koreňa klonu, nie inštaláciu.
Terminály serverov zostávajú v `backend/` a `frontend/`. Po zastavení servera
sa pred spustením iného bloku v tom istom termináli vráť do koreňa cez `Set-Location ..`.
Ak je port obsadený, zastav predchádzajúci server; Vite používa `strictPort`.

### Konfigurácia a alternatívne režimy

| Premenná | Význam |
| --- | --- |
| `VITE_API_BASE_URL` | Vo vývoji prázdna pre proxy; pri produkčnom builde povinný HTTPS origin backendu bez cesty, query a prihlasovacích údajov. |
| `VITE_GIS_SOURCE` | `local-api`, `arcgis` alebo `disabled`; neplatná hodnota zastaví konfiguráciu. |
| `APP_ENV` | `development` (predvolené) alebo `production`. |
| `SNAPSHOT_API_ENABLED` | Iba `true`/`false`; predvolene zapnuté vo vývoji, vypnuté v produkcii. |
| `CORS_ALLOWED_ORIGINS` | JSON zoznam presných originov, predvolene `[]`. V produkcii iba HTTPS, bez wildcard či koncovej lomky; CORS bez credentials. |

Premenné `$env:` platia pre aktuálny terminál. Frontend vie čítať `.env.local`;
backend `.env` automaticky nenačítava. Súbory `.env*.example` sú iba vzory.
Pri použití proxy nechaj API adresu prázdnu aj vo vlastných frontendových `.env*`:
starší PowerShell prázdnym priradením premennú odstráni a neprepíše hodnotu zo súboru.
Po zmene konfigurácie reštartuj príslušný server. `VITE_*` sú verejné hodnoty
vložené pri builde, preto do nich nepatria heslá ani tokeny.

- **`arcgis`:** v štartovacom bloku frontendu nastav `$env:VITE_GIS_SOURCE = 'arcgis'`.
  Načíta vrstvu 8 priamo do RAM prehliadača, bez lokálnych dátových súborov.
  Je povolený len na loopback adresách na lokálne technické overenie, bez fallbacku
  na snímku. Backend je potrebný iba pre indikátor health, nie pre GIS vrstvu.
- **`disabled`:** nastav `$env:VITE_GIS_SOURCE = 'disabled'`. Nevytvára GIS
  požiadavky a zobrazí odkaz na oficiálnu aplikáciu; backend nie je potrebný
  pre mapový podklad. Health požiadavka a OSM dlaždice zostávajú nezávislé od režimu.

Ručné obnovenie snímky, iba pri oprávnenom lokálnom použití; z koreňa klonu:

```powershell
Set-Location .\backend
.\.venv\Scripts\python.exe -m scripts.import_brownfields
Set-Location ..
```

Import prepíše snímku aj manifest; nie je súčasťou štartu aplikácie. Po obnove
obnov stránku. Pri chýbajúcej/poškodenej snímke alebo vypnutom endpointe očakávaj 503.

### Produkčné zostavenie

Z koreňa klonu po inštalácii závislostí:

```powershell
Set-Location .\frontend
$env:NODE_ENV = 'production'
$env:VITE_API_BASE_URL = 'https://backend.example.com'
$env:VITE_GIS_SOURCE = 'disabled'
npm.cmd run build
Set-Location ..
```

Adresa je iba dokumentačný príklad; pre funkčný health ju nahraď skutočným HTTPS
backendom. Build kontroluje TypeScript a vytvorí `frontend/dist/`. Produkcia
odmieta oba aktívne GIS režimy. Backend nastav na `APP_ENV=production`,
`SNAPSHOT_API_ENABLED=false` a presné HTTPS CORS originy. Vite vývojová proxy nie
je súčasťou statického hostingu; HTTPS a obsluhu buildu musí zabezpečiť hosting.

## Testovanie

Každý nasledujúci blok spusti samostatne **z koreňa klonu**, po inštalácii.
Oba testovacie bloky sa na konci vracajú do koreňa, takže ich možno vykonať aj za sebou
v rovnakom termináli bez pokusu o prechod do `backend/frontend`.
Testy používajú syntetické dáta a mockované odpovede; nepotrebujú živé ArcGIS API,
reálnu snímku ani bežiace servery.

Backend – závislosti a automatizované testy importu, API, konfigurácie a CORS:

```powershell
Set-Location .\backend
.\.venv\Scripts\python.exe -m pip check
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
Set-Location ..
```

Frontend – testy filtrov, výpočtov, konfigurácie, ArcGIS klienta a lint:

```powershell
Set-Location .\frontend
npm.cmd test
npm.cmd run lint
Set-Location ..
```

Testovací skript najprv typovo overí testy a potom spustí Node.js test runner.
Produkčný blok vyššie navyše overuje TypeScript aplikácie aj zostavenie Vite.
Pokryté sú chýbajúce hodnoty, neúplné dávky, duplicitné ID, chybné geometrie,
HTTP/ArcGIS chyby, timeouty, zrušenie požiadaviek a zdieľanie načítania v StrictMode.

## Dátové zdroje

Zdroj: **MIB / ArcGIS, evidencia brownfieldov 2022**, vrstva 8 „Brownfieldy nad 0,5 ha“.
[Oficiálna aplikácia](https://experience.arcgis.com/experience/e25edd3fc2e94da483798fd5dbf3500e/page/brownfieldy) ·
[ArcGIS REST endpoint](https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8).

Import aj priamy klient kontrolujú počet voči zdroju, úplnosť ID a dávok,
FeatureCollection a základnú geometriu vo WGS 84. Číslo 113 nie je validačnou
konštantou. Kontroly nezaručujú úplnú topológiu ani aktuálnosť využitia území.
ArcGIS klient má časové a veľkostné limity, obmedzené retry a rešpektuje dostupný
`Retry-After`; výsledky neukladá trvalo. Podrobnosti sú v dokumentácii režimov.

Počty vyjadrujú počet prvkov pred a po filtrovaní. Výmera je súčet konečných
nezáporných hodnôt `VYMERA_HA`, zaokrúhlený až pri zobrazení; chýbajúce hodnoty
sa nesčítavajú ako nula. Prázdny výsledok má 0 ha, neprázdny bez známych výmer
má „Neuvedené“. Nejde o geometrické zjednotenie ani výmeru transformačných území.
Vyhľadávanie používa `NAZOV`, číselný dopyt presnú zhodu `SPEC_CISLO` alebo `OBJECTID`.

**Podmienky použitia:** podklady uvádzajú CC BY 4.0 pri Experience, ale prázdne
`licenseInfo` služby. Rozsah licencie podkladovej vrstvy a jej redistribúcie
zostáva nevyjasnený; verejný prístup k API ho sám nepotvrdzuje. GeoJSON aj manifest
sú sledované Gitom napriek pravidlám `.gitignore`, čo treba pred verejnou
distribúciou vyriešiť spolu s oprávneniami vydavateľa. Verejné GIS zostáva vypnuté.

Mapový podklad: **© OpenStreetMap contributors**. Vyžaduje internet; aplikácia
nepodporuje hromadné sťahovanie ani offline cache dlaždíc.
[OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/).

## Podrobná dokumentácia

- [GIS prieskum – pôvod, atribúty a licenčné podklady](docs/gis-data-research.md)
- [Dátové režimy – validácia, sieťové limity a chybové stavy](docs/data-modes.md)
- [Plán nasadenia – infraštruktúra, obmedzenia a ďalší postup](docs/deployment-plan.md)
