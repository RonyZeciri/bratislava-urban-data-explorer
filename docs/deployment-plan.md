# Technický audit a plán verejného dema

Overené **15. 10. 2026** (Europe/Bratislava). Rozsah: existujúci zdrojový kód, konfigurácia, testy, README, [GIS prieskum](gis-data-research.md), lokálny Git vrátane reflogov a uložených nedosiahnuteľných objektov, verejné ArcGIS metadáta a oficiálna dokumentácia hostingu. Tento krok mení iba tento dokument. Nižšie uvedené produkčné úpravy sú **návrh, nie implementovaná funkcionalita**. Neboli inštalované závislosti, vytvorený commit, publikovaný repozitár ani nasadená služba.

## 1. Rozhodnutie pre sedemdňový termín

**Následný implementačný stav (15. 10. 2026):** konfigurácia API/GIS, predvolený
produkčný zákaz snímky, presné CORS, env príklady a testy už boli doplnené.
Pôvodné auditné nálezy nižšie zachytávajú stav pred touto úpravou. Následne bol
implementovaný aj priamy ArcGIS klient **iba pre lokálne technické overenie**,
so zdieľaním v pamäti a bez uloženia novej snímky. Produkčný build odmieta aktívne
GIS režimy a zostáva `disabled`. CI, hosting ani publikovanie nevznikli.
Aktuálne príkazy sú v [README](../README.md#konfigurácia-development-a-production),
aktuálna implementácia a rozdiely oproti návrhu v [dátových režimoch](data-modes.md).

Odporúčam **Render Static Site pre React a jednu malú platenú Render Web Service pre FastAPI**. Jeden poskytovateľ, automatické HTTPS, bez databázy, kontajnerovej orchestrácie a vlastnej domény. Orientačný základ je **7 USD/mesiac za backend**, statický frontend bez ceny za samotný hosting; prenosy, limity účtu, prípadné dane a konečnú cenu treba skontrolovať pred objednaním. Cena malého backendu je doložená [porovnaním samotného Renderu](https://render.com/articles/render-vs-railway); rozhodujúci pri objednávke je [aktuálny cenník](https://render.com/pricing).

Pre verejné GIS zobrazenie navrhujem **priame čítanie oficiálnej vrstvy z prehliadača**, bez kópie GeoJSON v Gite, build artefakte, našom CDN či verejnom FastAPI endpointe. Existujúci backendový režim so snímkou zostane pre lokálny vývoj. Verejný backend poskytne health a dokumentáciu; snímkový endpoint bude explicitne vypnutý. Je potrebné otvorene vysvetliť, že verejný GIS režim obchádza backend a lokálny režim demonštruje jeho validáciu. Nepridávať backendový proxy len preto, aby sa navonok vytvoril dojem full-stack toku.

**Licenčná podmienka:** priamy fetch nie je právna výnimka. Existuje opora pre používanie verejne zdieľaného obsahu v podmienkach ArcGIS, ale konkrétna licencia vrstvy nie je jednoznačne vyplnená. Pred verejným mapovým demom overiť podmienky vydavateľa a rozsah verejného zobrazovania, ideálne potvrdením MIB/mesta. Ak zostanú nejasné, zverejniť kód a technickú prezentáciu s odkazom na oficiálnu aplikáciu, GIS verejne nezapínať. Neodkladať ostatné dokončenie portfólia kvôli odpovedi vydavateľa. [Podmienky ArcGIS](https://doc.arcgis.com/en/arcgis-online/reference/terms-of-use.htm), [Esri právne podmienky](https://www.esri.com/en-us/legal/terms/web-site-service).

## 2. Čo je pripravené a čo chýba

Existujúca architektúra je vhodná veľkosti portfólia:

- `backend/app/main.py`: read-only `/api/health` a `/api/brownfields`; bez účtov, databázy, uploadu a editovania údajov.
- `backend/scripts/import_brownfields.py`: pevný oficiálny zdroj, explicitné polia, count/ID kontrola, dávky, limity odpovede, timeout a obmedzené opakovanie. Nejde o otvorený proxy prijímajúci ľubovoľné URL.
- `backend/app/brownfields.py`: kontrola identity, geometrie, regiónu, manifestu a SHA-256, posledná platná snímka v pamäti a zámok. SHA overuje konzistenciu súborov, nie digitálny podpis vydavateľa. Zápis dvojice nie je jedna transakcia; backend nezhodnú dvojicu nepodá.
- `frontend/src/api/`: typy a overenie odpovedí zo siete; hook rieši načítanie, chyby, timeout a zrušenie požiadavky.
- `frontend/src/domain/brownfieldAnalytics.ts`: čisté výpočty a filtre nad pamäťou, bez siete. `App.tsx` zdieľa výsledky medzi mapou a panelom. Samostatné komponenty mapy, vrstvy, detailu a analytiky sú primerané.
- React texty nevkladá cez `dangerouslySetInnerHTML`; popisy lokality sa interpretujú ako text. Mapa aj polygóny majú klávesnicové ovládanie, formuláre popisy, chybové stavy a responzívne CSS. Nejde o úplný audit WCAG.

### Prioritizované nálezy

| Priorita | Nález a dôkaz v kóde | Praktický dopad a najmenšia náprava |
| --- | --- | --- |
| P0 | Nejasný rozsah licencie vrstvy, pozri časť 4 | Bez vyjasnenia neposkytovať našu verejnú kópiu; schváliť dátový režim pred zapnutím GIS. |
| P0 | `getHealth` aj `getBrownfields` používajú relatívne `/api`; proxy existuje iba vo `vite.config.ts` | Na samostatnom statickom hostingu by sa API hľadalo na nesprávnom serveri. Doplniť spoločnú konfiguráciu API URL a presné CORS backendu. |
| P0 | `/api/brownfields` vždy číta lokálnu snímku; `.gitignore` ju oprávnene vylučuje | Čistý cloud deploy bez snímky vráti 503. Nerobiť import pri builde ani štarte; explicitne oddeliť verejný a lokálny režim. |
| P1 | Chýba čítanie environment konfigurácie aplikácie, `.env.example` aj produkčný návod | Zaviesť malú overovanú konfiguráciu podľa časti 6; aktuálne navrhnuté premenné nemajú účinok. |
| P1 | Health má timeout 5 s, GIS 15 s; žiadne tlačidlo opakovania | Render Free môže štartovať približne minútu. Uprednostniť platený backend a doplniť vedomé opakovanie, bez nekonečného pollingu. |
| P1 | Frontend overuje štruktúru súradníc, ale nie uzavretie kruhov a regionálny rozsah; spolieha sa na backend | Pri priamom ArcGIS režime doplniť ekvivalentné základné kontroly, count/ID a ochranu pred čiastočnou vrstvou. Syntetické testy aj pre chybné odpovede a limity. |
| P1 | Import overuje názvy polí, backendová geometrická validácia nekontroluje všetky typy atribútov | Pri schémovej zmene môže backend prijať snímku, ktorú frontend odmietne. Overiť aj požadované typy; null naďalej povoľovať. |
| P1 | Nie je CI, projektová licencia kódu ani produkčná konfigurácia bezpečnostných hlavičiek | Pridať jednoduché CI a rozhodnúť licenciu vlastného kódu oddelene od dát. HTTP hlavičky nastaviť na hostingu/backendu. |
| P2 | `SnapshotStore` ponechá poslednú platnú snímku bez viditeľného času/fallback indikátora | Lokálne spoľahlivé, ale používateľ nevie o zlyhaní novšej snímky. Zobraziť edíciu a čas získania, pri fallbacku upozorniť. |
| P2 | ETag je v odpovedi, ale endpoint nerieši `If-None-Match` a 304 | Neuvádzať, že je implementovaná podmienená HTTP cache. Pre 113 prvkov nejde o blokujúcu chybu. |
| P2 | Kľúč GeoJSON vrstvy tvorí iba množina ID; Leaflet dátový prop nemení | Dnešný hook nerefreshuje dáta, preto to nie je aktuálna chyba filtrov. Pri budúcom refreshi rovnakých ID so zmenenou geometriou zahrnúť revíziu dát do kľúča. |
| P2 | OSM po jednej chybe dlaždíc zostáva v stave error do obnovy stránky | Konzervatívny stav, nie pád; neskôr umožniť obnovu. Internetový podklad nie je offline funkcionalita. |

Geometrická kontrola neoveruje úplnú topológiu, samoprieseky ani administratívnu hranicu Bratislavy. Nepridávať GIS knižnicu či databázu len kvôli demu; tieto hranice jasne popísať. Súčet `VYMERA_HA` zostáva súčtom atribútov evidencie 2022, nie geometrickým zjednotením ani výmerou transformačných území. [Metodika v README](../README.md).

## 3. Git, citlivé údaje a závislosti

### Skutočný stav pri audite

- Vetvená história cez `git log --all` obsahuje dva commity:
  - `77c99cd09b94fef34cf2a1c7fb679a63fecee57c` – `chore: initialize full-stack project`.
  - `3038daf057757c3b17b9bd6ee5041296c64e2d80` – `feat: implement Bratislava brownfields explorer` (HEAD).
- Pracovný strom obsahuje necommitnutý analytický panel: úpravy README, `package.json`, `App.tsx`, `BrownfieldPanel.tsx` a nové analytické komponenty, doménové funkcie, testy a `tsconfig.tests.json`. Tento audit ich zachoval.
- `git remote -v` neuviedol žiadny remote. Neznamená to dôkaz, že súbory nikdy neboli kopírované inam.
- V indexe bolo 32 sledovaných súborov. Kontrola názvov v indexe, všetkých referenciách a reflogoch nenašla `.venv`, `node_modules`, `.env`, GeoJSON snímky, manifesty, súkromné kľúče ani generované buildy/logy.
- Preverených bolo 98 uložených Git objektov, z toho 61 blobov vrátane nedosiahnuteľných. Žiadny JSON blob nebol dátový FeatureCollection ani manifest snímky. `git fsck --full --no-reflogs` našiel štyri nedosiahnuteľné stromy; ich obsah tvorili projektové zdrojové súbory, nie GIS snímky. Nič sa nemazalo ani neprepisovalo.
- Hľadanie typických privátnych kľúčov a tokenov nenašlo zhodu; v dosiahnuteľnom obsahu a neignorovanom pracovnom strome prebehla aj kontrola priradených hesiel/secrets a URL s prihlasovacími údajmi. Toto je kontrola vzorov, nie dôkaz absencie každého možného tajomstva. Ignorované virtuálne prostredia sa obsahovo neauditovali ako vlastný zdrojový kód.
- `git check-ignore` potvrdil ignorovanie `.env`, virtuálneho prostredia, `node_modules`, `dist`, lokálneho GeoJSON aj manifestu. Pravidlá pre GIS sú úzko viazané na `backend/data/`; kópia v `frontend/public/` by nebola automaticky chránená. Pred publikovaním kontrolovať celý index a artefakty, nielen ignorovanie.
- Meno a e-mail autora Git commitov budú po publikovaní histórie viditeľné; nejde o heslo, ale vlastník má vedieť o zverejnení kontaktu. Bez jeho pokynu históriu neprepisovať.

### Výsledky kontrol v tomto audite

| Kontrola | Výsledok |
| --- | --- |
| `git diff --check` | Bez whitespace chýb; iba upozornenia na LF/CRLF |
| `npm.cmd test` | 12/12 testov, vrátane typovej kontroly testov |
| `npm.cmd run lint` | Úspech |
| `npm.cmd run build` | TypeScript aj Vite úspech, 70 modulov, JS približne 391 kB / 120 kB gzip |
| Python `unittest discover -s tests -v` | 16/16 testov vrátane ASGI API a importu |
| Python `pip check` | No broken requirements found |
| `npm.cmd audit --json` | 0 hlásených zraniteľností; bez `audit fix` a bez inštalácie |
| OSV `POST /v1/querybatch` | 14 presných PyPI verzií z requirements, žiadne vrátené advisory |

Zistené hlavné verzie: React/React DOM 19.3.1, React Leaflet 5.0.0, Leaflet 1.9.4, Vite 8.3.4, TypeScript 6.0.3, FastAPI 0.143.1, Starlette 1.8.0, Uvicorn 0.54.0. React Leaflet 5 sa zhoduje s existujúcim React 19. `package-lock.json` a `requirements.txt` fixujú reprodukovateľné závislosti; používať `npm ci`, nie voľnú aktualizáciu počas deploya.

Audit registrov je časová snímka známych problémov, nie penetračný test ani audit samotného Python/Node runtime a operačného systému. [OSV API](https://google.github.io/osv.dev/api/). Node 22.14 pri testoch hlási ExperimentalWarning pre stripovanie TypeScript typov, testy prejdú. Overiť podporovanú bezpečnostnú patch verziu runtime na hostingu, explicitne ju pripnúť a zopakovať testy; nepredpokladať bezpečnosť starej lokálnej patch verzie len na základe npm auditu.

## 4. Overený prístup ArcGIS a licenčné hranice

Verejné GET volania prebehli bez účtu, cookies a tokenu; odpovede neboli uložené ako nová snímka. Metadáta sa overovali priamo cez HTTPS Python klienta, keď ich webový čítací nástroj nedokázal sprístupniť.

| Oficiálny zdroj | Overený výsledok |
| --- | --- |
| [Experience item](https://www.arcgis.com/sharing/rest/content/items/e25edd3fc2e94da483798fd5dbf3500e?f=json) | HTTP 200, `access=public`, `licenseInfo` obsahuje CC BY 4.0 |
| [Web map item](https://www.arcgis.com/sharing/rest/content/items/a1b1fdcbe9b0435287893890ed9df3d3?f=json) | HTTP 200, `access=public`, `licenseInfo=""` |
| [Feature Service item](https://www.arcgis.com/sharing/rest/content/items/7b4eaa49abcf4e32b0a4162eaa3004e1?f=json) | HTTP 200, `access=public`, `licenseInfo=""` |
| [Vrstva 8](https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8?f=json) | `Brownfieldy nad 0,5 ha`, `capabilities=Query`, `maxRecordCount=2000`, `JSON, geoJSON, PBF`, prázdny `copyrightText`; HTTP 200 a CORS `*` |
| [Počet záznamov](https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8/query?where=1%3D1&returnCountOnly=true&f=json) | HTTP 200, `count=113`, bez ArcGIS error; s hlavičkou `Origin: https://example.com` odpoveď CORS `*` |
| [Malá GeoJSON požiadavka](https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8/query?where=1%3D1&outFields=OBJECTID%2CNAZOV%2CVYMERA_HA&resultRecordCount=1&outSR=4326&f=geojson) | HTTP 200, FeatureCollection s jedným prvkom, bez error, CORS `*` aj pri testovacom Origin |

Obmedzený vzorkový dotaz nie je dôkazom úplnosti vrstvy; ukazuje podporu GeoJSON a CORS. `maxRecordCount=2000` je limit počtu záznamov odpovede, **nie počet povolených požiadaviek za minútu**. Číselný limit požiadaviek ani SLA konkrétnej služby neboli potvrdené. Verejné čítanie môže vydavateľ obmedziť alebo odvolať. [ArcGIS Query dokumentácia](https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/).

Podmienky ArcGIS opisujú oprávnenia používateľov k verejne zdieľanému obsahu, podriadené obmedzeniam vydavateľa. To je relevantné a nemožno tvrdiť, že prázdne pole automaticky znamená zákaz. Zároveň licencia Experience sama osebe nepreukazuje, že CC BY platí pre každú podkladovú vrstvu. [ArcGIS podmienky](https://doc.arcgis.com/en/arcgis-online/reference/terms-of-use.htm), [Esri podmienky](https://www.esri.com/en-us/legal/terms/web-site-service).

Praktický postup: požiadať vydavateľa o potvrdenie verejného interaktívneho zobrazovania vrstvy 8 v neoficiálnom portfóliu, prípadného cacheovania a redistribúcie, požadovanej atribúcie a technických obmedzení. Správu v tomto kroku nikomu neposielame. Ak potvrdí CC BY 4.0 pre vrstvu, uviesť autora/atribúciu, odkaz na zdroj a licenciu a označiť vykonané úpravy. [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.en). Nejde o právne stanovisko zaručujúce oprávnenie; dokument oddeľuje overené metadáta od odporúčania.

### Spoľahlivý priamy dátový režim – návrh

1. Pevne povoliť iba existujúci layer 8 endpoint; neprijímať ľubovoľnú URL z query parametrov. Nepoužívať `outFields=*`, token ani vlastnícke mená; zachovať explicitné existujúce polia z importéra.
2. Pri otvorení stránky načítať metadáta, count a zoznam ID, potom GeoJSON cez `objectIds`, `outSR=4326`, `f=geojson` v dávkach najviac `min(maxRecordCount,500)`. Znovu overiť count a editovacie metadáta. Pre dnešných 113 ide o jednu dátovú dávku; hranica 113 nie je validačné pravidlo.
3. Overiť HTTP aj JSON `error` (ArcGIS môže vrátiť chybu s HTTP 200), úplnú množinu unikátnych ID, count, požadované typy, FeatureCollection, Polygon/MultiPolygon, konečnosť a rozsah súradníc, uzavretie a nedegenerovanosť kruhov. Ak zdroj skráti dávku alebo sa počas čítania zmení, nezobraziť čiastočné súhrny ako úplné.
4. Načítať raz na otvorenie stránky, zdielať rovnaký výsledok všetkým komponentom. Žiadne volania pri filtrovaní, posúvaní mapy ani výbere. V jednom otvorení stránky zdieľať rozpracované načítanie; vývojový StrictMode nesmie vytvoriť dva dokončené exporty.
5. Návrh prevádzkových hraníc: timeout jednej požiadavky 15 s, celého načítania 60 s, dávky sekvenčne, najviac jedno automatické opakovanie pre sieť/5xx/429 s odstupom a jitterom. Tieto hodnoty sú naša politika, nie limity ArcGIS. `Retry-After` rešpektovať, ak je cez CORS čitateľný; inak oznámiť obmedzenie a povoliť manuálne opakovanie po konzervatívnom odstupe. Neobchádzať 401/403/498/499 získavaním tokenov.
6. Kontrolovať veľkosť odpovede aj skutočne prečítané bajty (návrh 25 MB, podľa importéra), počet dávok a celkový čas. Pri nečakanom náraste dát zastaviť s vysvetlením a upraviť limit vedome, nie donekonečna sťahovať.
7. Aplikačné dáta držať iba v pamäti otvorenej stránky. Nevytvárať service worker, localStorage/IndexedDB export ani CDN zálohu GIS. To nevylučuje bežnú HTTP cache podľa hlavičiek oficiálneho servera; nesľubovať, že prehliadač nevytvorí žiadnu technickú kópiu.
8. Pri chybe zachovať už úspešne načítané dáta v tej istej relácii s označením času a upozornením. Pri prvom neúspešnom načítaní zobraziť nedostupnosť, tlačidlo opakovania a [oficiálnu aplikáciu](https://experience.arcgis.com/experience/e25edd3fc2e94da483798fd5dbf3500e/page/brownfieldy). Žiadne fiktívne dáta ani tichý fallback na našu verejnú snímku.

**Alternatíva až po potvrdení práv:** FastAPI môže sťahovať vrstvu na požiadanie do RAM so zámkom a TTL, zdieľať jednu obnovu medzi klientmi a poskytovať poslednú platnú odpoveď. Aj RAM proxy a verejný endpoint sú ďalšie poskytovanie dát; nejde o obídenie licencie. TTL a povolené stale obdobie treba dohodnúť, nevyvodzovať ich z verejného GET. Túto druhú cestu teraz paralelne neimplementovať.

## 5. Možnosti hostingu

Údaje sú overené k dátumu auditu, bez uzavretia objednávky. USD, bez garancie celkovej ceny, dostupnosti regiónu či schválenia účtu.

| Varianta | Overené náklady a limity | Vhodnosť |
| --- | --- | --- |
| Render Static + Render Free FastAPI | Statický hosting zdarma; Free backend 750 hodín na workspace/mesiac, 512 MB RAM. Po 15 min bez prevádzky sa uspí, obnovenie asi minútu. Súbory sa stratia pri reštarte/uspávaní/redeployi, bez persistent disku; prenosy a buildy majú kvóty. | Dobré skúšobné nasadenie, horšia prvá návšteva a pohovor. Dnešné 5/15 s timeouty sú problém. Neudržiavať ho umelými pingmi. [Free](https://render.com/docs/free), [compute](https://render.com/docs/compute-plans). |
| **Render Static + malý platený Render FastAPI** | Základ orientačne 7 USD/mesiac za 0,5 CPU / 512 MB; statický frontend zdarma. Platená inštancia odstraňuje obmedzenia Free uspávania, nie možnosť výpadku. Bez disku a DB; kontrolovať prenosy a rozpočet. | **Odporúčanie:** jeden účet a jednoduché oddelené buildy. [Cena](https://render.com/articles/render-vs-railway), [typy služieb](https://render.com/docs/compute-plans), [FastAPI](https://render.com/docs/deploy-fastapi). |
| Cloudflare Pages + Render backend | Pages Free: 500 buildov/mesiac, jeden súbežný build, 20 min timeout, 20 000 súborov, 25 MiB/súbor. Statické požiadavky bez poplatku a bez limitu počtu; Functions majú samostatné Workers kvóty. Backend stojí a správa sa rovnako ako vyššie. | Kvalitný statický hosting, ale druhý poskytovateľ navyše. Neprenášať dnešný FastAPI do Pages Functions; to nie je bežný Uvicorn hosting. [Limity](https://developers.cloudflare.com/pages/platform/limits/), [účtovanie](https://developers.cloudflare.com/pages/functions/pricing/). |
| Render Static alebo Pages + Railway FastAPI | Railway Free má 1 USD kreditu/mesiac, nie garanciu nepretržitého API. Hobby minimum 5 USD/mesiac vrátane 5 USD spotreby; nad kredit sa spotreba dopláca. Trial je časovo/kreditovo obmedzený, nie dlhodobý bezplatný server. | Použiteľné, ale meraná spotreba vyžaduje rozpočtové limity a kontrolu účtu. Pre krátky termín menší prínos než existujúci Render návod. [Plány](https://docs.railway.com/pricing/plans), [FastAPI](https://docs.railway.com/guides/fastapi). |

VPS, Kubernetes, Redis, PostGIS a Docker nie sú potrebné pre tento termín. Bezplatná alternatíva má význam, ak je rozpočet striktne nula; treba otvorene vysvetliť oneskorený štart API. Pre prezentáciu má malá platená inštancia vyššiu hodnotu než pridávanie infraštruktúry.

## 6. Odporúčaná architektúra a konfigurácia

```text
Prehliadač --HTTPS--> Render Static Site (iba frontend/dist)
           --HTTPS--> Render FastAPI /api/health, /docs
           --HTTPS--> oficiálny ArcGIS layer 8 (GeoJSON priamo, podmienene oprávnením)
           --HTTPS--> tile.openstreetmap.org (podklad a atribúcia)

Lokálny vývoj: React --> Vite /api proxy --> FastAPI --> ignorovaná validovaná snímka
Verejné FastAPI: /api/brownfields --> 503, snímkový režim explicitne zakázaný
```

Verejná schéma nepotrebuje persistentný GIS disk. Reštart API nevymaže frontend a nevyvolá nový export ArcGIS. Výpadok API nemá zablokovať priamu GIS mapu; indikátor backendu musí pravdivo ukázať nedostupnosť. Bezpečnostné a dátové režimy musia byť explicitné, nie odvodené len od toho, či súbor náhodou existuje.

### Premenné, ktoré treba doplniť

| Navrhnutá premenná | Význam a pravidlo |
| --- | --- |
| `VITE_API_BASE_URL` | Verejná HTTPS adresa API bez koncovej lomky; lokálne prázdna hodnota pre Vite proxy. Použiť pre oba existujúce API klienty. |
| `VITE_GIS_SOURCE` | Overený enum `local-api`, `arcgis`, `disabled`. Produkciu zapnúť vedome až po licenčnom rozhodnutí; pri neplatnej hodnote odmietnuť build/konfiguráciu. |
| `APP_ENV` | Backend `development` / `production`, overovaný vstup. |
| `CORS_ALLOWED_ORIGINS` | Backendový JSON zoznam presných frontend originov, napr. neskôr pridelená HTTPS adresa bez cesty. Nepoužiť plošné `*`; preview domény povoľovať vedome. |
| `SNAPSHOT_API_ENABLED` | Explicitný boolean, pre verejný cloud `false`; neparsovať cez `bool("false")`. Endpoint zachovať s 503 a verejne vhodným vysvetlením. |
| `DATA_DIR` | Voliteľná absolútna cesta pre lokálnu snímku; predvolená dnešná cesta. Nie používateľský HTTP parameter. |
| `PORT` | Port dodaný hostingom; použiť v štartovacom príkaze Uvicornu. |

Oficiálny ArcGIS endpoint, layer ID a edíciu ponechať v jednej konštante s povoleným hostom; nie voľne prepisovateľný proxy cieľ. Na dnešné verejné čítanie API kľúč netreba. Ak sa oprávnenia zmenia, vrstvu vypnúť, nie vkladať súkromný token do frontendu.

Vite premenné `VITE_*` sa zapisujú do verejného JavaScriptu **pri builde**; nie sú secrets a ich zmena vyžaduje nový build. Hostingové runtime premenné samy osebe hotový statický balík nezmenia. [Vite env](https://vite.dev/guide/env-and-mode).

CORS vo FastAPI: presné originy, iba potrebné `GET`, bez credentials/cookies; hlavičky povoliť iba podľa skutočného klienta. CORS je pravidlo prehliadača, nie autentifikácia a nebráni cudzím serverom volať verejné API. Pre ArcGIS rozhodujú hlavičky ArcGIS, ktoré naše FastAPI nenastaví. Nepoužiť `mode: no-cors`, pretože odpoveď nebude čitateľná. [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/).

HTTPS ukončuje platforma; nevystavovať Vite dev server ani `vite preview` ako produkčný server. Backend `0.0.0.0:$PORT`, bez `--reload`, na demo jeden worker. Produkčné chyby nesmú odhaliť traceback, lokálne cesty či citlivú konfiguráciu. `/docs` pri verejnom read-only API možno zachovať ako portfóliovú ukážku; nesmie obsahovať secrets.

Port a ukončenie HTTPS sú doložené v [Render Web Services](https://render.com/docs/web-services). Health overuje iba beh aplikácie; nie pripravenosť ArcGIS či dostupnosť mapových dát. Tieto stavy zobrazovať a testovať oddelene.

Na statickom hostingu nastaviť `X-Content-Type-Options: nosniff`, rozumnú Referrer-Policy a ochranu proti vloženiu do cudzieho iframe. CSP najprv otestovať s Leaflet: povoliť skripty z vlastného pôvodu, `connect-src` pre vlastné API a konkrétny ArcGIS host, `img-src` pre OSM a potrebné `data:` obrázky. Leaflet používa inline štýly, preto nekopírovať slepo prísnu CSP, ktorá rozbije mapu. Nepridávať analytics a cookies bez potreby. Pri priamom prístupe poskytovatelia ArcGIS/OSM uvidia IP a bežné HTTP metadáta návštevníka; stručne uviesť externé služby.

OSM: zachovať atribúciu, HTTPS, Referer a bežnú browser cache, žiadny hromadný download alebo offline balík dlaždíc. Verejný tile server nemá SLA. [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/).

## 7. Konkrétny postup budúceho nasadenia

Nasledujúce kroky sa vykonajú až v ďalšej implementačnej úlohe a po rozhodnutí o publikovaní/hostingu.

1. Dokončiť P0 dátové rozhodnutie, pripraviť stručnú otázku vydavateľovi; nepovažovať mlčanie za súhlas. Zvoliť jeden verejný dátový režim. Bez vyjasnenia pripraviť `disabled` variant.
2. Doplniť malé konfiguračné moduly, API base URL, presné CORS a vypnutie verejného snímkového endpointu; lokálny tok ponechať. Doplniť priamy ArcGIS klient a testy podľa časti 4, žiadny nový framework. Pred prvým HTTP volaním overiť konfiguráciu.
3. Pridať `.env.example` bez tajomstiev, CI pre npm test/lint/build a Python testy. V CI nevolať živý ArcGIS ani nesťahovať snímku. Overiť čistý clone: testy musia prejsť aj bez `backend/data`.
4. Zvoliť licenciu vlastného kódu, opraviť README pre verejnosť: relatívne `Set-Location backend/frontend` namiesto závislosti na jednej Windows ceste, architektúra oboch dátových režimov, zdroje a obmedzenia. Oddeliť licenciu knižníc, vlastného kódu a dát. Nepripisovať MIB autorstvo našej aplikácie ani používať jeho logo bez oprávnenia.
5. Pred publikovaním skontrolovať `git status`, `git diff --check`, `git diff --cached`, názvy aj obsah celého indexu, históriu a pripravované prílohy. Skontrolovať aj screenshoty, ZIP, `frontend/public/`, CI artefakty a prípadný Docker build context. Nepridávať dáta, manifesty, `.env`, `.venv`, `node_modules`, buildy alebo tokeny. Až po výslovnom súhlase commit/publikovanie; tento dokument súhlas nepredstavuje.
6. Budúce Render API nastavenie: typ **Web Service / Python**, root `backend`, build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health cesta `/api/health`. `$PORT` je zápis cloudového Linux shellu, nie PowerShell príkaz. Nastaviť `APP_ENV=production`, `SNAPSHOT_API_ENABLED=false`, presné CORS. Pri prvom vytvorení origin frontendu doplniť po pridelení adresy. Žiadny import v build/start príkaze.
7. Render frontend: typ **Static Site**, root `frontend`, build `npm ci && npm run build`, publish directory `dist`; vložiť skutočnú HTTPS API adresu do `VITE_API_BASE_URL`, správny `VITE_GIS_SOURCE`. Zverejniť iba dist, nie celý repozitár. Existujúca aplikácia má jednu cestu; SPA rewrite `/*` na `/index.html` pridávať až podľa potreby routovania a nikdy ním nemaskovať API chyby. [Static Sites](https://render.com/docs/static-sites).
8. Explicitne pripnúť a overiť Node/Python runtime: pre prvý reprodukovateľný pokus vychádzať z testovaného prostredia (Node 22, Python 3.13), zvoliť podporovaný patch a znovu spustiť kontroly. Nastavenia hostingu sú popísané v [Node verziách](https://render.com/docs/node-version) a [Python verziách](https://render.com/docs/python-version). Nie je nutný Docker.
9. Overiť skutočné HTTPS URL v čistom prehliadači: health 200, backend CORS z povoleného originu, neprítomnosť povoľujúcej CORS hlavičky pre cudzí origin, snímkový endpoint 503, GeoJSON priamo z ArcGIS, source/edition, počet verzus zdroj, filtre, reset, detail, priblíženie, klávesnicu a mobil. Overiť, že vo verejných súboroch nie je GIS snímka ani kľúč.
10. Simulovať výpadok API, ArcGIS, OSM, timeout, 429, ArcGIS error s HTTP 200, nedokončenú dávku a poškodenú geometriu. Automatické testy použiť s mockmi, nie zaťažovaním oficiálnej služby. Obnovenie stránky nesmie tvoriť nekonečné retries. Zaznamenať dátum, build commit a výsledky. Nastaviť rozpočtové upozornenia; pre pohovor uložiť poslednú funkčnú verziu a rollback postup.

## 8. Plán siedmich dní a rozsah

| Deň | Priorita a výstup | Kritérium dokončenia |
| --- | --- | --- |
| 1 | P0: licenčné rozhodnutie/podnet vydavateľovi, konfigurácia a dátový režim | Jasné, čo verejne povoľujeme; žiadne automatické publikovanie snímky. |
| 2 | P0/P1: ArcGIS klient, validačné a chybové stavy, lokálny režim zachovaný | Count/ID/geometria, timeout a limity testované synteticky. Ak práva nejasné, verejné GIS disabled. |
| 3 | P1: env príklady, CORS, testy, CI, čistý clone | Jedným zdokumentovaným postupom prejdú všetky kontroly bez dátovej snímky. |
| 4 | P1: pripravenie a po autorizácii publikovanie kódu/nasadenie | HTTPS demo, žiadne secrets/dáta v repozitári ani dist, health a dátové stavy pravdivé. |
| 5 | P1: reálne smoke testy, mobil, a11y, chyby | Vyhľadávanie a filter synchronizované; výpadok zdroja aplikáciu nezrúti. |
| 6 | P1: README, architektúra, video a nácvik pohovoru | Päťminútový zrozumiteľný príbeh a pripravená offline záloha. |
| 7 | Rezerva, opravy a stabilizácia | Bez nových funkcií; posledná overená verzia, odkazy a kontrola pred pohovorom. |

Ak ostáva menej času, spojiť dni, zachovať poradie P0 → P1. Nepridávať účty, databázu, transformačné vrstvy, administráciu ani ďalšie analytické funkcie. P2 robiť len ak neohrozí dokončenie.

## 9. Pohovor a výpadok internetu

Pripraviť približne päťminútovú prezentáciu: problém a historická edícia → dôveryhodný zdroj a licenčné rozhodnutie → tok dát/validácia → vyhľadanie, filter, výber a štatistiky → testy a vedomé obmedzenia. Vedieť vysvetliť `OBJECTID` verzus `SPEC_CISLO`, `[lon,lat]`, Polygon/MultiPolygon, CORS, limity odpovede a súčet atribútov bez odpočtu prekryvov.

Na notebooku mať vopred nainštalované lokálne závislosti, README a tento plán, build a testy. Skontrolovať lokálny import a manifest ešte pred pohovorom; existujúca súkromná lokálna snímka sa nepremiestňuje do verejného repozitára. Jej offline použitie aj zachytenie dát vo videu/screenshotách treba zahrnúť do rozhodnutia o právach; obrázok nie je automatická licenčná výnimka. Pripraviť krátky lokálny záznam fungovania a čitateľné technické snímky s atribúciou v rozsahu dovoleného použitia.

Pri výpadku internetu možno lokálne ukázať backend, testy, zdrojový kód a – ak je použitie dát dovolené – filtrovanie/detail nad lokálnou snímkou. OSM sa bez siete nemusí načítať; nesľubovať offline mapový podklad a nesťahovať zásobu dlaždíc. Vysvetliť túto hranicu, ukázať polygóny bez podkladu alebo povolený videozáznam. Ak oprávnenie k dátam nie je potvrdené, záloha je prezentácia architektúry a testov, nie tajná verejná dátová kópia.

Lokálne spustenie bez aktivácie prostredia, dve okná PowerShellu z koreňa projektu:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

```powershell
Set-Location frontend
npm.cmd run dev
```

Otvoriť `http://127.0.0.1:5173`. Po implementácii dátových režimov má lokálna konfigurácia používať `local-api`, nie verejný `arcgis`. Na notebooku predviesť aj testy bez internetu; nevyžadujú živý zdroj. Verejné demo a lokálna záloha sú dve nezávislé prezentačné možnosti, nie garancia dostupnosti externých služieb.
