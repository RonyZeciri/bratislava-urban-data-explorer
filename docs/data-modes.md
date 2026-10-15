# Dátové režimy – aktuálna implementácia

Stav a lokálne integračné overenie: **15. 10. 2026**. Tento dokument opisuje
implementovaný kód; historické návrhy a audit sú v [deployment pláne](deployment-plan.md).
Pôvod a licenčné nejasnosti sú v [GIS prieskume](gis-data-research.md).

## Režimy a bezpečná hranica

| Režim | Odkiaľ získava geografické dáta | Uloženie | Dostupnosť |
| --- | --- | --- | --- |
| `local-api` | Existujúce FastAPI `/api/brownfields` cez API base/Vite proxy | Existujúca ignorovaná validovaná snímka na backende | Bežný lokálny vývoj |
| `arcgis` | Prehliadač priamo z pevnej vrstvy 8 ArcGIS | Iba RAM jednej stránky | Len lokálne technické overenie na loopback hoste |
| `disabled` | Žiadne GIS volanie | Žiadne GIS dáta | Jediný povolený produkčný režim |

Konfigurácia povoľuje vo vývoji tri hodnoty, ale produkčný build aj produkčný
runtime odmietnu aktívny GIS režim. ArcGIS runtime overuje aj hostname:
`localhost`, `127.0.0.1`, `[::1]`. Nejde o potvrdenie práv k dátam. Zmena tejto
hranice pre verejný hosting musí byť samostatným vedomým rozhodnutím až po
vyjasnení podmienok. `.env.production.example` zostáva `disabled`.

Health API a OSM dlaždice sú nezávislé od tohto prepínača. Disabled znamená
vypnutie vrstvy brownfieldov, nie vypnutie všetkej siete. Backendová ochrana
`SNAPSHOT_API_ENABLED=false` naďalej vracia 503 bez čítania snímky.

## Súbory a tok

- `frontend/src/api/brownfieldData.ts`: spoločné GeoJSON typy, pevná URL a
  základná runtime validácia. Pôvodný modul `brownfields.ts` typy reexportuje,
  takže existujúca mapa a analytické funkcie zostávajú kompatibilné.
- `api/validateArcgis.ts`: whitelist polí a typov, metadáta, count/ID,
  úplnosť dávok, Polygon/MultiPolygon a základná geometrická kontrola.
- `api/arcgis.ts`: jeden reprodukovateľný export, HTTP/JSON chyby, limity,
  sekvenčné dávky, timeout a obmedzené opakovanie. Žiadny meniteľný endpoint.
- `api/sharedLoad.ts`: rozpracovaný export a posledný úspech iba v pamäti.
  Odberatelia majú samostatný abort; odchod jedného neukončí načítanie ostatným.
  Po odchode posledného sa zrušenie krátko odloží na StrictMode remount.
- `api/abort.ts`: zrušiteľné čakanie na fetch, telo odpovede a retry odstup;
  odstráni poslucháče aj pri chybe/ukončení.
- `api/brownfields.ts` a `domain/gisMode.ts`: lazy výber správneho loadera.
  ArcGIS nikdy nepoužije lokálny fallback; disabled nevolá ani jeden loader.
- `hooks/useBrownfields.ts`: jeden stav loading/error/disabled/ready a vedomé
  opakovanie. Celá kolekcia sa zverejní komponentom až po všetkých kontrolách.
- `App.tsx`: odovzdá tú istú kolekciu mape, filtrom aj analytike. Revízia údajov
  je súčasťou kľúča Leaflet vrstvy, aby sa pri budúcej novej geometrii nezachovala stará.
- `BrownfieldPanel.tsx` a `RetryButton.tsx`: zdroj, edícia 2022, samostatný čas
  získania, detail, chyby, odkaz na oficiálnu aplikáciu a blokovanie predčasného retry.

```text
Prehliadač → metadáta → count → všetky OBJECTID → GeoJSON dávky
           → validácia úplného výsledku → záverečný count a metadáta
           → zdieľaná RAM → useBrownfields → App → mapa / filter / analytika
```

Backend a existujúci Python import sa v tomto kroku nemenili. Rozdelenie
frontendových typov oddelilo čistú validáciu od Vite konfigurácie, aby sa dal
klient testovať cez vstavaný Node test runner bez prehliadača a ďalších knižníc.

## Overený zdroj a dotazy

Pevná URL:
[ArcGIS FeatureServer/8](https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8).
Metadáta potvrdili `objectIdField=OBJECTID`, `maxRecordCount=2000`,
`geometryType=esriGeometryPolygon`, `capabilities=Query` a podporu GeoJSON.
Limity jednotlivých služieb sa nesmú zamieňať s neoverenou kvótou požiadaviek.
[Metadáta vrstvy](https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8?f=json).

Klient pošle `where=1=1&returnCountOnly=true&f=json`, potom
`where=1=1&returnIdsOnly=true&f=json`. Overí názov ID poľa, bezpečné celé čísla,
počet aj jedinečnosť ID a usporiada ich. Pre podmnožiny ID používa `/query` s
`objectIds`, explicitným `outFields`, `returnGeometry=true`, `outSR=4326`,
`f=geojson`. Veľkosť dávky je `min(maxRecordCount, 500)`.
[Oficiálna Query dokumentácia](https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/).

Whitelist je rovnaký ako v existujúcom Python importe: `OBJECTID`, `SPEC_CISLO`,
`NAZOV`, `ADRESA`, `MC`, `VYMERA_HA`, `PR_VYU_POP`, `N_FUNK_POP`, `ZAMER`,
`DRUH_VLA`, `NKP_NAZOV`, `SEZ_POPIS`, `ZONA_OZNACENIE`. Schéma musí zodpovedať
overeným typom OID/Integer/Double/String. Nepoužíva sa `outFields=*`, vlastnícke
meno ani interné cesty. Chýbajúca hodnota null nie je dôvodom na vyhodenie lokality.

## Validácia a obmedzenia

HTTP neúspech a ArcGIS `error` aj pri HTTP 200 sú chyby, nie prázdne datasety.
Count sa neporovnáva s univerzálnou konštantou 113. Každá dávka musí presne
zodpovedať požadovanej množine ID; duplicitné, chýbajúce alebo iné ID a
`exceededTransferLimit=true` zabránia zobrazeniu celku. Na záver sa znova porovná
count a trojica dátumov zmien z `editingInfo`.

Geometria musí byť neprázdny Polygon/MultiPolygon, súradnice konečné v poradí
longitude/latitude, s 2 alebo 3 číslami. Regionálny rámec je
`[16.8, 47.9, 17.4, 48.4]`, rovnaký ako na backende. Kruh má aspoň štyri pozície,
zhodný začiatok a koniec, aspoň tri rôzne XY body a nenulovú orientovanú plochu.
Prípadné legacy CRS musí označovať WGS84/CRS84, nie Web Mercator.

Nie je overená celá topológia, samoprieseky, orientácia dier, administratívna
hranica ani prekryvy. Viacero REST požiadaviek nie je databázová transakcia;
kontroly odhalia viditeľnú zmenu count/edit metadát, nie každú teoretickú zmenu
bez aktualizácie metadát zdrojom. Výmera sa nepočíta z geometrie, používa sa
existujúca metodika `VYMERA_HA` a chýbajúce výmery sa nezamieňajú za nulu.

## Čas, limity a správanie pri výpadku

- 15 s na požiadavku vrátane čítania tela a 60 s na celý export.
- 25 MB na jednu odpoveď, 50 MB súhrnne cez čítané telá exportu, aj opakované.
  Limit sa kontroluje cez Content-Length, ak existuje, aj počas streamovania.
- Najviac 10 000 objektov a 50 dátových dávok. Toto sú ochranné limity aplikácie.
- Najviac jedno automatické opakovanie na HTTP 429/5xx alebo sieťovú chybu,
  predvolene po aspoň 1 s s malým jitterom. Timeout, neplatný JSON, schéma,
  neúplnosť a poškodené údaje sa automaticky neopakujú.
- `Retry-After` ako sekundy alebo HTTP dátum sa rešpektuje, ak ho CORS služby
  sprístupní. Čakanie nad 30 s nevedie k automatickému retry. Aj keď celkový
  timeout ukončí čakanie skôr, manuálne opakovanie sa nepovolí pred týmto časom.
  Ak hlavička nie je čitateľná, klient pozná iba svoj konzervatívny odstup;
  nemôže tvrdiť, že pozná skrytú kvótu služby.
- HTTP 401/403/498/499 a autentifikačné ArcGIS chyby sa neobchádzajú ani
  neopakujú s kľúčom. ArcGIS JSON chyby sú ukončenie, aj keď status je 200.

Pri chybe zostávajú štatistiky nedostupné, nevydávajú sa za nulu. Panel ukáže
vysvetlenie, **Opakovať** a oficiálnu Experience. Po chybe možno spustiť nový
celý pokus; nie je automatický polling. Pri úspechu sa výsledok drží iba v RAM
stránky; jeho čas získania sa nemení filtrovaním. Obnova stránky/HMR môže
spustiť nový export, preto pri vývoji po úspešnom overení zbytočne neobnovovať.
Po zatvorení stránky nie je k dispozícii offline fallback ArcGIS režimu.

Fetch používa `credentials: omit`, `redirect: error` a `cache: no-store`.
Neukladá dáta do localStorage, IndexedDB, service workera, súboru ani backendu.
OSM podklad zostáva samostatný a používa pôvodné pravidlá cache/atribúcie;
zmena cache sa týka ArcGIS JSON, nie dlaždíc.

## Overenie

Automaticky prešlo **37 frontendových testov**, lint, TypeScript a produkčný build
s `VITE_GIS_SOURCE=disabled`, a **27 backendových testov**. ArcGIS testy používajú
iba syntetické `TEST_ONLY` odpovede. Overujú úspech, dávkovanie vrátane hranice
500, prázdny dataset, chyby metadát/ID/count, neúplnosť a duplicitné ID,
Polygon/MultiPolygon, geometriu a atribúty, HTTP/ArcGIS chyby, retry a Retry-After,
veľkosť, per-request/celkový timeout, zrušenie počas fetch/tela/čakania,
StrictMode remount, cache úspechu iba v RAM a opakovanie po chybe.

Lokálny prehliadač v režime ArcGIS úspešne overil **113 prvkov a 113 polygónov**;
čas dokončeného získania bol `2026-10-15T13:55:26.336Z`, edícia zostala **2022**.
Súčet zdrojových výmer: **579,75 ha**. Vyhľadanie, detail a zvýraznenie fungovali;
rozsah 1–10 ha mal **62** výsledkov v zozname aj vrstve a **174,32 ha**.
Aj local-api a disabled boli overené v prehliadači. Živé načítanie sa nerobilo
z testov ani pri filtrovaní; nevznikol nový GeoJSON/manifest ani verejné nasadenie.

Aktuálne príkazy pre PowerShell sú v [README](../README.md#lokálne-technické-overenie-priameho-arcgis-režimu).
Pri budúcom rozhodovaní o verejnom prístupe najprv vyjasniť podmienky vydavateľa;
technicky funkčný CORS alebo verejné GET nie sú samostatné potvrdenie licencie.
