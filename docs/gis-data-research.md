# Technický prieskum GIS údajov – Bratislava Urban Data Explorer

**Dátum overenia: 15. 10. 2026, Europe/Bratislava.**

Rozsah: verejná konfigurácia zadanej ArcGIS Experience, jej nadväzujúca webová mapa a Feature Service, porovnanie významu údajov s koncepciou MIB a návrh budúceho importu. Vznikol iba tento dokument. Aplikácia, závislosti ani Git história sa v tomto kroku nemenili. Odpovede služieb boli spracované v pamäti; nevznikla lokálna dátová kópia.

## 1. Výsledok a odporúčanie

**Overený zdroj polygónov existuje.** Stránka `brownfieldy` aplikácie „Odvetvové štúdie“ používa mapu `BF_2022` a službu `BF_aktualizácia_2022_WFL1`. Identita služby bola odvodená z konfigurácie mapy, nie z odhadnutého názvu URL. [Konfigurácia Experience][EXPD], [konfigurácia mapy][MAPD], [služba][SERVICE].

Na prvý budúci import odporúčam samostatnú vrstvu **Brownfieldy nad 0,5 ha**, ID **8**, so **113 záznamami**. Významné brownfieldy (ID **0**, **19 záznamov**) a veľké areály – zóny a bloky (ID **1**, **32 záznamov**) musia zostať samostatnými kategóriami. Počty sú aktuálne výsledky `returnCountOnly`, nie odhad podľa posledného OBJECTID. [Počet 8][C8], [počet 0][C0], [počet 1][C1].

Koncepcia označuje veľké zóny a bloky ako transformačné územia. Ide o iný priestorový objekt než jednotlivý brownfield. Vrstva 1 je preto relevantným geografickým podkladom pre transformačné územia, nie ďalšími 32 brownfieldmi. Zhodu každej položky a verzie PDF však nemožno automaticky predpokladať. [Koncepcia, tlačená s. 75][PDF75], [vrstva 1][L1].

**Dôležitá hranica použitia:** ide o dáta aktualizácie **2022**, nie o overený stav využívania pozemkov v októbri 2026. Technicky funkčný export nie je potvrdením aktuálnosti ani úplnej topologickej správnosti. [Mapa – metadáta][MAP], [metadáta vrstvy 8][L8].

## 2. Reťaz pôvodu a verejná konfigurácia

| Stupeň | Overená identita | Zdroj |
| --- | --- | --- |
| Aplikácia | `e25edd3fc2e94da483798fd5dbf3500e`, názov `Odvetvové štúdie`, typ `Web Experience`, `access=public` | [Metadáta][EXP] |
| Stránka | `page_2`, label `brownfieldy`, desktopový layout `layout_6` | [Konfigurácia][EXPD] |
| Mapový widget | `widget_13`, `initialMapDataSourceID=dataSource_4` | [Konfigurácia][EXPD] |
| Dátový zdroj | `dataSource_4`, `WEB_MAP`, `sourceLabel=BF_2022`, portál `https://MagBa.maps.arcgis.com` | [Konfigurácia][EXPD] |
| Webová mapa | `a1b1fdcbe9b0435287893890ed9df3d3`, názov `BF_2022`, `access=public` | [Metadáta][MAP] |
| Feature Service item | `7b4eaa49abcf4e32b0a4162eaa3004e1`, názov `BF_aktualizácia_2022_WFL1`, `access=public` | [Metadáta služby][ITEM] |
| Organizácia | aplikácia, mapa a služba uvádzajú `orgId=pRlN1m0su5BYaFAS` | [Aplikácia][EXP], [mapa][MAP], [služba][ITEM] |

Verejný REST koreň služby, načítaný bez prihlásenia:

```text
https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer
```

Kódovanie `%C3%A1` je URL kódovanie znaku `á` v názve služby. Metadáta overené na [tomto presnom URL][SERVICE].

Mapa explicitne odkazuje na štyri operational layers: **10, 0, 8, 1**, v tomto poradí. V konfigurácii týchto vrstiev nebol nájdený `definitionExpression`. Ostatné vrstvy v nasledujúcom inventári boli objavené v koreňových metadátach tej istej služby; nie sú všetky pridané do tejto webovej mapy. [Konfigurácia mapy][MAPD], [inventár služby][SERVICE].

Experience obsahuje aj webové mapy školstva, zelene, bývania a záhradkárskych osád. Pre brownfieldy bola preukázaná väzba práve na `BF_2022`; nesúvisiace mapy neboli zamieňané za zdroj brownfieldov. [Konfigurácia Experience][EXPD].

## 3. Inventár všetkých vrstiev nájdenej služby

**Spoločné vlastnosti:** všetkých 11 vrstiev deklaruje zdrojový `wkid=102100`, `latestWkid=3857` (Web Mercator), `maxRecordCount=2000`, podporu stránkovania a formáty `JSON, geoJSON, PBF`. Pri každej vrstve bol úspešný aj dotaz na jednu GeoJSON geometriu s `outSR=4326`. Odkazy „metadáta“, „počet“ a „GeoJSON“ v tabuľke sú overené čítacie endpointy pre danú vrstvu.

| ID a názov | Natívna geometria | Počet | Vybrané skutočné atribúty | Zdroje |
| --- | --- | ---: | --- | --- |
| 0 – Významné brownfieldy | Polygon | 19 | `OBJECTID`, `Spec_cislo`, `NAZOV`, `MC`, `ADRESA`, `vymera_v_ha` | [Metadáta][L0], [počet][C0], [GeoJSON][G0] |
| 1 – Veľké areály - zóny a bloky | Polygon | 32 | `OBJECTID`, `názov`, `oznacenie`, `MC`, `vymera_v_ha`, `R2019`, `R2022`, `indikatory_graf` | [Metadáta][L1], [počet][C1], [GeoJSON][G1] |
| 2 – Identifikačná schéma pôvodného využitia BF | Point | 113 | `OBJECTID`, `SPEC_CISLO`, `NAZOV`, `PR_VYU_POP`, `P_VYUZITIE` | [Metadáta][L2], [počet][C2], [GeoJSON][G2] |
| 3 – Identifikačná schéma BF podľa vlastníctva | Point | 113 | `OBJECTID`, `SPEC_CISLO`, `NAZOV`, `DRUH_VLA` | [Metadáta][L3], [počet][C3], [GeoJSON][G3] |
| 4 – Identifikačná schéma environmentálneho zaťaženia BF | Point | 113 | `OBJECTID`, `SPEC_CISLO`, `NAZOV`, `KONTAMIN`, `SEZ_POPIS` | [Metadáta][L4], [počet][C4], [GeoJSON][G4] |
| 5 – Identifikačná schéma BF v stabilizovanom a rozvojovom území | Point | 113 | `OBJECTID`, `SPEC_CISLO`, `NAZOV`, `STAB_ROZ`, `STAB`, `ROZVOJ` | [Metadáta][L5], [počet][C5], [GeoJSON][G5] |
| 6 – Identifikačná schéma BF podľa ekonomického potenciálu | Point | 113 | `OBJECTID`, `SPEC_CISLO`, `NAZOV`, `POTENCIAL` | [Metadáta][L6], [počet][C6], [GeoJSON][G6] |
| 7 – Identifikačná schéma cieľového využitia BF nad 0,5 ha | Point | 113 | `OBJECTID`, `SPEC_CISLO`, `NAZOV`, `N_FUNK_POP`, `F_VYUZ_KOD` | [Metadáta][L7], [počet][C7], [GeoJSON][G7] |
| 8 – Brownfieldy nad 0,5 ha | Polygon | 113 | `OBJECTID`, `SPEC_CISLO`, `NAZOV`, `MC`, `VYMERA_HA`, `ZONA_OZNACENIE` | [Metadáta][L8], [počet][C8], [GeoJSON][G8] |
| 9 – Hranica mestskej pamiatkovej rezervácie a pamiatkovej zóny | Polygon | 6 | `OBJECTID`, `Id`, `NAZOV_PZ`, `TYP_PZ`, `DATUM_VYHL`, `NAZOV_PZ_CELY` | [Metadáta][L9], [počet][C9], [GeoJSON][G9] |
| 10 – Environmentálne záťaže | Polygon | 73 | `OBJECTID`, `KOD`, `AREA`, `SANACIA`, `STAV_SAN`, `REGISTER`, `IDENTIF` | [Metadáta][L10], [počet][C10], [GeoJSON][G10] |

Vrstvy 2–7 sú pomenované tematické bodové schémy, nie polygónové hranice lokalít. Rovnaký počet 113 sám osebe nepreukazuje zhodu všetkých ich záznamov s vrstvou 8; párovanie po jednotlivých identifikátoroch nebolo v tomto kroku vykonané. Vrstva 9 je pamiatkový kontext a vrstva 10 environmentálny kontext; ich záznamy sa nesmú pripočítať k počtu brownfieldov. [Metadáta vrstiev 2–10][SERVICE].

Pozor: koreň služby uvádza `supportedQueryFormats=JSON`, ale jednotlivé vrstvy uvádzajú aj GeoJSON a ich GeoJSON dotazy skutočne fungovali. O podpore exportu preto rozhoduje overenie konkrétneho layer endpointu, nie iba koreňové metadáta. [Koreň][SERVICE], [vrstva 8][L8], [export 8][G8].

## 4. Atribúty a ich interpretácia

Názvy polí treba zachovať presne, vrátane veľkosti písmen a diakritiky. V nasledujúcich výberoch `OID` znamená `esriFieldTypeOID`, `Integer` celočíselné pole, `SmallInteger` malé celé číslo, `Double` desatinné číslo, `String` text a `Date` dátumové pole. Úplné schémy vrátane dĺžok a všetkých technických polí sú dostupné v odkazovaných metadátach; import má byť založený na explicitnom výbere, nie na nekontrolovanom `outFields=*`.

### 4.1 Evidované brownfieldy – vrstva 8

| Skupina | Overené polia a typy |
| --- | --- |
| Identita | `OBJECTID: OID`, `SPEC_CISLO: Integer`, `BF_ID_TAB: String`, `GlobalID: String` |
| Popis | `NAZOV`, `ADRESA`, `MC`, `KU`, `OKRES`: String |
| Výmera | `VYMERA_HA: Double` (alias „Výmera“), `VYMERA: Integer` |
| Využitie a súvislosti | `PR_VYU_POP`, `N_FUNK_POP`, `F_VYUZ_KOD`, `ZAMER`, `DRUH_VLA`, `PAM_ZONA`, `NKP_NAZOV`, `SEZ_POPIS`: String |
| Väzba na zónu | `ZONA_NAZOV`, `ZONA_OZNACENIE`, `ZONA_NAZ_OZN`: String |
| Obdobie evidencie | `R2019`, `R2022`: SmallInteger; `DATUM`, `DAT_VYRADE`, `AKTUALIZACIA2022`: Date |
| Ostatné príznaky | `AKTUALIZAC`, `NOVY_BF`, `VYRADENIE`, `NA_SLEDOVA`: String |

Zdroj schémy: [vrstva 8][L8]. Webová mapa označuje `VYMERA_HA` ako výmeru a `SPEC_CISLO` ako evidenčné číslo. Názvy `GlobalID` či príznakov samy nezaručujú formát alebo význam každej hodnoty. Nezdokumentované kódy netreba prekladať odhadom. [Popup konfigurácia][MAPD].

### 4.2 Významné brownfieldy – vrstva 0

`OBJECTID: OID`, `Spec_cislo: Integer`, `NAZOV: String`, `ADRESA: String`, `MC: String`, `vymera_v_ha: Double`, `VYMERA: Integer`, `DATUM: Date`, `BF_ID_TAB: String`. Dostupné sú aj `DRUH_VLA`, `POVOD_VYUZ`, `ZAMER`, `VYRADENIE`, `PUBLIKACIA` a ďalšie popisné polia. [Úplná schéma 0][L0].

Koncepcia vysvetľuje významné brownfieldy ako osobitnú kategóriu s historickou či architektonickou hodnotou, pri ktorej nemusí platiť hranica 0,5 ha. Preto ich neodstraňovať veľkostným filtrom ani nezamieňať s transformačnými územiami. [Koncepcia, tlačená s. 37][PDF37].

### 4.3 Veľké areály – zóny a bloky – vrstva 1

Úplný zoznam polí tejto malej schémy: `R2019: SmallInteger`, `R2022: SmallInteger`, `OBJECTID: OID`, `Id: Integer`, `názov: String`, `vyhodenie: String`, `oznacenie: String`, `Okres: Double`, `KU: String`, `MC_SKR: String`, `vymera: Integer`, `MC: String`, `vymera_v_ha: Double`, `indikatory_graf: String`, `Shape__Area: Double`, `Shape__Length: Double`. [Schéma 1][L1].

`indikatory_graf` je textové pole, vyplnené pri všetkých 32 záznamoch. Kontrolovaná prvá neprázdna ukážka obsahovala cestu k obrázku na lokálnom Windows disku autora, nie verejnú HTTP URL ani štruktúrované číselné indikátory. Formát všetkých ostatných hodnôt nebol osobitne validovaný. Lokálne cesty sa nemajú zobrazovať používateľovi ani používať ako sieťové adresy. Metadáta deklarujú prílohy, ale ich obsah a použiteľnosť neboli overené. [Atribútový dotaz][QIND], [metadáta 1][L1].

### 4.4 Environmentálne záťaže – vrstva 10

`OBJECTID: OID`, `ID: Integer`, `KOD: String`, `SANACIA: String`, `STAV_SAN: String`, `ZARADENIE: String`, `KóD_C: String`, `K1`, `K2`, `K3`, `K`, `R`, `V`, `ID2`, `OKRES`: SmallInteger, `AREA: Double`, `IDENTIF: String`, `REGISTER: String`, `POZN: String`, `Shape__Area: Double`, `Shape__Length: Double`. [Schéma 10][L10].

Popup mapy označuje `AREA` ako výmeru v m². Je to samostatný údaj služby; bez ďalšieho overenia nevyvodzovať z jeho prieniku s brownfieldom kontamináciu celej lokality ani neinterpretovať stav sanácie ako aktuálny. [Popup konfigurácia][MAPD].

## 5. Čo bolo skutočne overené na GeoJSON

Na štyroch hlavných vrstvách bol načítaný kompletný malý export s výberom polí a limitom 500. Dáta zostali iba v pamäti. Pre vrstvy 2–7 a 9 bola overená iba jedna GeoJSON geometria a celkový počet, nie úplná kvalita exportu. [Export 8][G8], [export 0][G0], [export 1][G1], [export 10][G10].

| Kontrola | Vrstva 8 | Vrstva 0 | Vrstva 1 | Vrstva 10 |
| --- | ---: | ---: | ---: | ---: |
| Počet prvkov v plnom exporte | 113 | 19 | 32 | 73 |
| Jedinečné `feature.id` | 113 | 19 | 32 | 73 |
| Polygon | 113 | 19 | 32 | 72 |
| MultiPolygon | 0 | 0 | 0 | 1 |
| Prázdna geometria | 0 | 0 | 0 | 0 |
| Nekonečné / nečíselné alebo mimo svetového rozsahu súradnice | 0 | 0 | 0 | 0 |
| Neuzavreté kruhy alebo kruhy kratšie než 4 pozície | 0 | 0 | 0 | 0 |

Počty exportu sa zhodovali s count dotazmi. Vrátený GeoJSON nemal nastavený `exceededTransferLimit=true`; absencia tohto príznaku sama osebe nebola použitá ako jediný dôkaz úplnosti. [Počty 8][C8], [0][C0], [1][C1], [10][C10].

Rozsah exportu vrstvy 8 v poradí `[minLon, minLat, maxLon, maxLat]` bol `[16.9789467523709, 48.0229540240236, 17.2377600458091, 48.2336762740352]`. Súradnice aj názvy lokalít podporujú záver, že ide o Bratislavu; nebol to test presného obsiahnutia v administratívnej hranici mesta. [Export 8][G8].

**Táto kontrola nepreukazuje úplnú topologickú validitu.** Neboli testované samoprieseky, orientácia všetkých kruhov, vzájomné prekryvy, plošná zhoda s parcelami ani administratívnou hranicou. Bez GIS knižnice alebo kontroly v QGIS to nemožno tvrdiť.

GeoJSON používa WGS 84 a poradie `[longitude, latitude]`, kým bežný Leaflet `center` používa `[latitude, longitude]`. GeoJSON komponent súradnice spracuje sám; polygónom ich netreba ručne prehadzovať. Zdrojové Web Mercator súradnice by sa nemali poslať ako GeoJSON v stupňoch. [RFC 7946, § 3.1.1 a § 4][RFC], [GeoJSON export s outSR=4326][G8].

## 6. Kvalita, časová platnosť a nesúlady

### A. Dátum aplikácie sa nerovná dátumu dát – vysoké riziko interpretácie

Item Experience má `modified=1791188005000`, teda **5. 10. 2026 08:13:25 UTC**. Webová mapa má `modified=1744121224000`, teda **8. 4. 2025 14:07:04 UTC**. Vrstva 8 má `dataLastEditDate=1679307560864`, teda **20. 3. 2023 10:19:20.864 UTC**. [Experience][EXP], [mapa][MAP], [vrstva 8][L8].

V atribúte `AKTUALIZACIA2022` vrstvy 8 bolo 112 neprázdnych hodnôt od **6. 4. 2022** do **19. 7. 2022** UTC; jeden záznam mal null. `R2022=1` malo všetkých 113 záznamov. Dátum publikovania ani editácie služby nie je dôkazom nového terénneho prieskumu. Odporúčanie: vo výslednej aplikácii uvádzať edíciu 2022 aj dátum získania kópie. [Profilový dotaz][Q8].

### B. Názov vrstvy nie je bezpečný validačný filter – stredné riziko

Štyri zo 113 záznamov majú `VYMERA_HA < 0.5`, hoci názov vrstvy znie „Brownfieldy nad 0,5 ha“:

| OBJECTID | SPEC_CISLO | NAZOV | VYMERA_HA |
| ---: | ---: | --- | ---: |
| 18 | 86 | TECHNICKÝ OBJEKT | 0.478021705698 |
| 131 | 314 | PRI TREŤOM RYBNÍKU | 0.420860293306 |
| 136 | 297 | BÝVALÁ BUDOVA NEMOCNICE NA KRAMÁROCH | 0.422327311412 |
| 144 | 306 | OPUSTENÁ ŠKÔLKA | 0.485941360966 |

Zdroj: [dotaz na výmery][QAREA]. Príčina nebola overená. Tieto záznamy automaticky neodstrániť; názov kategórie a konkrétna výmera sú dve odlišné informácie.

### C. Chýbajúce väzby na zóny – stredné riziko

`ZONA_OZNACENIE` bolo null v **65 zo 113** záznamov vrstvy 8. `OBJECTID`, `SPEC_CISLO`, `NAZOV`, `MC` a `VYMERA_HA` v tomto výbere nemali null. `SPEC_CISLO` bolo jedinečné v rámci 113 riadkov. Vo vrstve 0 bolo jedinečných 19 hodnôt `Spec_cislo`; prienik s kódmi vrstvy 8 bol prázdny. Nejde však o dôkaz neprekrývajúcich sa geometrií. [Profil 8][Q8], [kódy 0][QCODE0], [výbery exportov 0][G0] a [8][G8].

Odporúčanie: identita prvku má zahŕňať službu, layer ID a OBJECTID; evidenčné číslo slúži ako samostatný doménový identifikátor. Null zónu prezentovať ako chýbajúcu evidovanú väzbu, nie ako dôkaz, že lokalita neleží v nijakej zóne. Priestorové priradenie by bolo novým analytickým výsledkom, ktorý treba označiť.

### D. Tabuľky PDF a služba nie sú vo všetkých položkách zhodné – vysoké riziko spájania

Textová extrakcia PDF ukazuje rozdiely medzi tabuľkami na tlačených stranách **77 a 78**, napríklad E1 (2,63 oproti 6,63 ha), D7 (13,28 oproti 13,50 ha) a údaje pri E6/E7. API vrstvy 1 zodpovedá pri týchto príkladoch druhej tabuľke. Ide o zistený nesúlad zdrojov, nie o potvrdenie, ktorý údaj je správny. [PDF s. 77][PDF77], [PDF s. 78][PDF78], [atribúty vrstvy 1][Q1].

Pokus o screenshot PDF sa nepodarilo spoľahlivo zobraziť; porovnanie stojí na textovej extrakcii. Pred prípadnou opravou dát treba vizuálne potvrdiť originálne riadky a požiadať správcu o výklad. Hodnoty neprepisovať podľa vlastného odhadu.

### E. Výmera a skóre – dve ďalšie obmedzenia

Súčet uložených `VYMERA_HA` vo vrstve 8 je **579.752169443674 ha** a súčet `vymera_v_ha` vo vrstve 1 **1130.081646409787 ha**. Ide o súčty atribútov jednotlivých záznamov, nie plochu ich geometrického zjednotenia. Rozdielne entity ani ich výmery nesčítavať do jedného „celkového brownfieldu“. [Profil 8][Q8], [profil 1][Q1].

`Shape__Area` v zdrojovej projekcii nie je náhradou za overenú fyzickú výmeru. Pri budúcom prepočte použiť vhodnú plošnú projekciu alebo geodetickú metódu a zachovať pôvodnú hodnotu aj spôsob výpočtu. Číselné skóre koncepcie nie je pripraveným exportom poľa `indikatory_graf`; na jeho pripojenie je potrebný samostatný overený zdroj. [Schéma 1][L1], [obsah indikátorového poľa][QIND].

## 7. Oprávnenia a limity

- Metadáta aplikácie, mapy aj service item uvádzajú `access=public`. Overené REST volania používali iba verejné GET požiadavky bez `token`, `Authorization`, účtu a prihlasovacích cookies. Čitateľnosť tak bola overená aj prakticky. [EXP][EXP], [MAP][MAP], [ITEM][ITEM], [GeoJSON 8][G8].
- Service aj hlavné vrstvy deklarujú `capabilities=Query`; nebola vykonaná žiadna editácia, administrátorská operácia ani pokus obchádzať oprávnenia. [SERVICE][SERVICE], [L8][L8].
- Limit je `maxRecordCount=2000`; hlavné overené exporty mali limit 500 a skutočný počet pod touto hranicou. Podpora `supportsPagination=true` je deklarovaná, ale import nad hranicou 2000 sa neskúšal. `syncEnabled=false`. [SERVICE][SERVICE], [L8][L8].
- Prílohy sú deklarované pre vrstvy 1 a 8; ich zoznamy a stiahnutie neboli overené. Ostatné dve hlavné vrstvy majú `hasAttachments=false`. [L1][L1], [L8][L8], [L0][L0], [L10][L10].
- Experience uvádza `licenseInfo` obsahujúce **CC BY 4.0**, ale `licenseInfo` webovej mapy aj service item je prázdne a hlavné vrstvy majú prázdny `copyrightText`. Prístup bez autentifikácie preto nemožno zameniť za jednoznačne zdokumentované podmienky ďalšej distribúcie každého datasetu. Pred verejným zverejnením stiahnutej kópie treba overiť podmienky u vydavateľa a zachovať atribúciu zdroja. [EXP][EXP], [MAP][MAP], [ITEM][ITEM], [L8][L8].

## 8. Návrh spoľahlivého získania a uloženia pre FastAPI

**Nasledujúci postup je návrh; v aplikácii nebol implementovaný.** Na portfóliový projekt je vhodná kontrolovaná lokálna kópia overených dát, aby sa služba ArcGIS nevolala pri každom pohybe mapy.

1. **Explicitné zdroje:** povoliť iba vyššie overenú službu a zvolené layer IDs. Začať vrstvou 8; 0 a 1 importovať oddelene až po rozhodnutí o rozsahu. Nedovoliť používateľovi zadávať ľubovoľnú vzdialenú URL.
2. **Metadáta pred importom:** zaznamenať item/service/layer ID, schému, dátumy, zdrojový SR, limit, počet a podmienky použitia. Overiť prítomnosť požadovaných polí a správne typy. Zmenu schémy hlásiť, nie potichu ignorovať.
3. **Malé a konečné dotazy:** pri aktuálnom počte stačí jeden vyššie overený export s `outSR=4326`, `f=geojson`, explicitnými `outFields`, `orderByFields=OBJECTID ASC` a `resultRecordCount=500`. Pri raste použiť overenie ID zoznamu a dávky `objectIds`, prípadne stránkovanie podľa možností služby; presnú zvolenú variantu najprv otestovať. [Význam parametrov a limity][ESRIQUERY].
4. **Sieťové správanie:** nastaviť timeout a obmedzený počet opakovaní, pri 429 rešpektovať `Retry-After`, pri 401/403/498/499 nepokračovať obchádzaním prístupu. Validovať HTTP výsledok aj prípadný ArcGIS JSON objekt `error`, pretože samotné HTTP 200 nemusí znamenať úspešný dátový dotaz.
5. **Úplnosť:** zosúladiť count, jedinečné OBJECTID a získané prvky. Sledovať `exceededTransferLimit`, ale nespoliehať iba naň. Pri exporte viacerými dávkami kontrolovať medzery a duplicity a porovnať dátum poslednej editácie pred aj po získaní; zmenu počas importu označiť a dávku zopakovať.
6. **Validácia GeoJSON:** vyžadovať `FeatureCollection`, rozumný maximálny objem, jedinečné ID v rámci vrstvy, `Polygon`/`MultiPolygon`, neprázdne geometrie, konečné súradnice v správnom poradí, uzavreté kruhy, správne typy a explicitne povolené null hodnoty. Zvlášť kontrolovať regionálny rozsah a úplnú topológiu; neautomatizovať opravy bez evidencie.
7. **Oddelenie surových a normalizovaných údajov:** do budúceho backendového dátového priečinka ukladať samostatný GeoJSON súbor pre každú vrstvu/edíciu a manifest s presným dotazom, dátumom získania UTC, počtom, schémou, zdrojovými dátumami a SHA-256 obsahu. Ponechať pôvodné názvy polí v surovej kópii; mapovanie na jednotné frontendové názvy viesť osobitne.
8. **Bezpečné uloženie:** zapisovať najprv do dočasného súboru v rovnakom priečinku, po úspešnej kontrole ho atómovo nahradiť. Chybný alebo neúplný export nikdy nesmie nahradiť poslednú platnú kópiu. Obnovovanie spúšťať vedome, nie pri každom štarte požiadavky.
9. **Rozhranie FastAPI:** poskytovať validovanú kópiu a informácie o zdroji, edícii a čase získania. Do verejnej odpovede vybrať iba potrebné polia. `MAJITELIA`, `MAPOVAL`, interné cesty a podobné polia neprenášať automaticky. Cache/ETag odvodiť od verzie kópie. Konkrétne nové aplikačné endpointy ešte neexistujú.

Začiatok možno pripraviť pomocou štandardnej Python knižnice (`urllib.request`, `urllib.parse`, `json`, `hashlib`, `pathlib`, `datetime`). Úplnú topologickú kontrolu by bolo treba neskôr vyriešiť vhodným GIS nástrojom; v tejto úlohe sa nič neinštalovalo.

### Reprodukovateľné čítacie overenie bez ďalších knižníc

Tento ukážkový kód nič neukladá a nie je importérom aplikácie. Používa rovnaký count dotaz a rovnaký GeoJSON dotaz pre vrstvu 8, aké boli úspešne overené:

```python
import json
from urllib.parse import urlencode
from urllib.request import urlopen

layer = (
    "https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/"
    "BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8"
)

def read_json(params):
    with urlopen(layer + "/query?" + urlencode(params), timeout=40) as response:
        payload = json.load(response)
    if "error" in payload:
        raise RuntimeError(payload["error"])
    return payload

count = read_json({"where": "1=1", "returnCountOnly": "true", "f": "json"})
data = read_json({
    "where": "1=1",
    "outFields": "OBJECTID,NAZOV,SPEC_CISLO,MC,VYMERA_HA",
    "returnGeometry": "true",
    "outSR": 4326,
    "orderByFields": "OBJECTID ASC",
    "resultRecordCount": 500,
    "f": "geojson",
})
assert data["type"] == "FeatureCollection"
assert len(data["features"]) == count["count"]
assert len({feature["id"] for feature in data["features"]}) == count["count"]
print(count["count"], "prvkov")
```

Výsledok pri overení: **113 prvkov**, bez potreby tokenu. Kontrola count/ID nie je náhradou za zvyšok validácie uvedenej vyššie. [Overený export][G8].

## 9. Návrh zobrazenia v React Leaflet

**Iba návrh, bez úprav aktuálneho frontendu:**

- Vložiť dátový komponent s `GeoJSON` ako `children` existujúceho `CityMap`. Súradnice GeoJSON neprehadzovať; štandard je `[lon, lat]`. [RFC][RFC].
- Zobraziť oddelené prepínateľné vrstvy: evidované brownfieldy 2022 (8), významné brownfieldy (0), transformačné územia/zóny a bloky (1). Environmentálne záťaže prípadne ako samostatný kontext, nie ako dôkaz kontaminácie celého brownfieldu. [Schémy a názvy vrstiev][SERVICE].
- Polygóny 8 zobraziť výplňou, zóny 1 odlišným obrysom; aktívny prvok zvýrazniť a v prípade výberu upraviť pohľad cez `fitBounds`. Neodvodzovať skóre farbou, pokiaľ nie je overené.
- Výber uchovávať podľa typu vrstvy a zdrojového identifikátora. Bočný panel vyplniť overenými poľami: názov, evidenčné číslo, mestská časť, adresa, zdrojová výmera, pôvodné využitie a edícia. Pri zóne použiť `názov`, `oznacenie` a `vymera_v_ha`; pri významnom brownfielde `Spec_cislo`. Null zobraziť ako „Neuvedené v zdroji“.
- Zdrojové texty renderovať ako obyčajný React text, nie ako HTML cez `dangerouslySetInnerHTML` či nekontrolovaný popup reťazec. Nefunkčné lokálne cesty nezobrazovať.
- Rozlíšiť stavy: načítavanie údajov, chyba, platný prázdny výsledok a vybraná lokalita. Indikátor dostupnosti FastAPI nie je indikátor kvality alebo aktuálnosti dát.
- Pri vrstve aj v paneli uviesť názov zdroja, rok 2022, dátum získania a dohodnutú atribúciu. Atribúcia mestských dát je samostatná od existujúcej atribúcie podkladových dlaždíc OpenStreetMap.

## 10. Ďalší postup a otvorené otázky

1. Potvrdiť s vydavateľom podmienky publikovania dátovej kópie a či existuje novšia edícia tejto služby.
2. Vyjasniť rozdiely v tabuľkách koncepcie a správny význam kódov zón pred pripojením hodnotenia alebo iných externých tabuliek.
3. Pre prvú implementáciu odsúhlasiť vrstvu 8 ako samostatný dataset aktualizácie 2022 a potvrdiť zoznam verejne zobrazovaných polí.
4. Až potom pripraviť import, testy úplnosti a schémy, ukladanie poslednej platnej kópie a endpoint FastAPI.
5. Pripojiť polygóny a výber v mape; ďalšie vrstvy pridať oddelene. Neodvodzovať hranice ani chýbajúce atribúty z ilustrácií alebo vlastných odhadov.

Limity tejto analýzy: nejde o audit všetkých služieb organizácie ani o potvrdenie aktuálneho stavu lokalít; prílohy, všetky textové kódy, geometrická topológia, administratívne obsiahnutie, úplné párovanie bodových schém a zón ani záťažové limity služby neboli overené. Neboli vykonané zápisy do vzdialených služieb a nevznikol Git commit.

## Zdroje a presné overené URL

Všetky odkazy na ArcGIS metadáta, počty a GeoJSON v tomto dokumente boli čítané 15. 10. 2026 bez autentifikácie. GeoJSON odkazy 0, 1, 8 a 10 sú overené úplné malé exporty; ostatné sú overené jednoprvcové ukážky. Dokumentácia Esri a RFC vysvetľuje formát a parametre, nie aktuálnosť konkrétnych mestských údajov.

[EXP]: https://www.arcgis.com/sharing/rest/content/items/e25edd3fc2e94da483798fd5dbf3500e?f=pjson
[EXPD]: https://www.arcgis.com/sharing/rest/content/items/e25edd3fc2e94da483798fd5dbf3500e/data?f=pjson
[MAP]: https://www.arcgis.com/sharing/rest/content/items/a1b1fdcbe9b0435287893890ed9df3d3?f=pjson
[MAPD]: https://www.arcgis.com/sharing/rest/content/items/a1b1fdcbe9b0435287893890ed9df3d3/data?f=pjson
[ITEM]: https://www.arcgis.com/sharing/rest/content/items/7b4eaa49abcf4e32b0a4162eaa3004e1?f=pjson
[SERVICE]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer?f=pjson
[PDF75]: https://mib.sk/wp-content/uploads/2026/02/FINAL_Koncepcia-rozvoja-brownfieldov_2026.pdf#page=75
[PDF77]: https://mib.sk/wp-content/uploads/2026/02/FINAL_Koncepcia-rozvoja-brownfieldov_2026.pdf#page=77
[PDF78]: https://mib.sk/wp-content/uploads/2026/02/FINAL_Koncepcia-rozvoja-brownfieldov_2026.pdf#page=78
[PDF37]: https://mib.sk/wp-content/uploads/2026/02/FINAL_Koncepcia-rozvoja-brownfieldov_2026.pdf#page=37
[ESRIQUERY]: https://developers.arcgis.com/rest/services-reference/enterprise/query-feature-service-layer/
[RFC]: https://datatracker.ietf.org/doc/html/rfc7946

[L0]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/0?f=pjson
[C0]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/0/query?where=1%3D1&returnCountOnly=true&f=json
[G0]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/0/query?where=1%3D1&outFields=OBJECTID%2CNAZOV%2CSpec_cislo%2CMC%2Cvymera_v_ha&returnGeometry=true&outSR=4326&orderByFields=OBJECTID+ASC&resultRecordCount=500&f=geojson
[L1]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/1?f=pjson
[C1]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/1/query?where=1%3D1&returnCountOnly=true&f=json
[G1]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/1/query?where=1%3D1&outFields=OBJECTID%2Cn%C3%A1zov%2Coznacenie%2CMC%2Cvymera_v_ha&returnGeometry=true&outSR=4326&orderByFields=OBJECTID+ASC&resultRecordCount=500&f=geojson
[L2]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/2?f=pjson
[C2]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/2/query?where=1%3D1&returnCountOnly=true&f=json
[G2]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/2/query?where=1%3D1&outFields=OBJECTID&returnGeometry=true&outSR=4326&resultRecordCount=1&f=geojson
[L3]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/3?f=pjson
[C3]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/3/query?where=1%3D1&returnCountOnly=true&f=json
[G3]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/3/query?where=1%3D1&outFields=OBJECTID&returnGeometry=true&outSR=4326&resultRecordCount=1&f=geojson
[L4]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/4?f=pjson
[C4]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/4/query?where=1%3D1&returnCountOnly=true&f=json
[G4]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/4/query?where=1%3D1&outFields=OBJECTID&returnGeometry=true&outSR=4326&resultRecordCount=1&f=geojson
[L5]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/5?f=pjson
[C5]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/5/query?where=1%3D1&returnCountOnly=true&f=json
[G5]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/5/query?where=1%3D1&outFields=OBJECTID&returnGeometry=true&outSR=4326&resultRecordCount=1&f=geojson
[L6]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/6?f=pjson
[C6]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/6/query?where=1%3D1&returnCountOnly=true&f=json
[G6]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/6/query?where=1%3D1&outFields=OBJECTID&returnGeometry=true&outSR=4326&resultRecordCount=1&f=geojson
[L7]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/7?f=pjson
[C7]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/7/query?where=1%3D1&returnCountOnly=true&f=json
[G7]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/7/query?where=1%3D1&outFields=OBJECTID&returnGeometry=true&outSR=4326&resultRecordCount=1&f=geojson
[L8]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8?f=pjson
[C8]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8/query?where=1%3D1&returnCountOnly=true&f=json
[G8]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8/query?where=1%3D1&outFields=OBJECTID%2CNAZOV%2CSPEC_CISLO%2CMC%2CVYMERA_HA&returnGeometry=true&outSR=4326&orderByFields=OBJECTID+ASC&resultRecordCount=500&f=geojson
[L9]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/9?f=pjson
[C9]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/9/query?where=1%3D1&returnCountOnly=true&f=json
[G9]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/9/query?where=1%3D1&outFields=OBJECTID&returnGeometry=true&outSR=4326&resultRecordCount=1&f=geojson
[L10]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/10?f=pjson
[C10]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/10/query?where=1%3D1&returnCountOnly=true&f=json
[G10]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/10/query?where=1%3D1&outFields=OBJECTID%2CKOD%2CAREA&returnGeometry=true&outSR=4326&orderByFields=OBJECTID+ASC&resultRecordCount=500&f=geojson
[Q8]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8/query?where=1%3D1&outFields=OBJECTID%2CNAZOV%2CSPEC_CISLO%2CMC%2CVYMERA_HA%2CR2019%2CR2022%2CZONA_OZNACENIE%2CAKTUALIZACIA2022%2CDATUM&returnGeometry=false&orderByFields=OBJECTID+ASC&f=json
[Q1]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/1/query?where=1%3D1&outFields=OBJECTID%2Cn%C3%A1zov%2Coznacenie%2CMC%2Cvymera_v_ha%2CR2019%2CR2022&returnGeometry=false&orderByFields=OBJECTID+ASC&f=json
[QCODE0]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/0/query?where=1%3D1&outFields=OBJECTID%2CSpec_cislo&returnGeometry=false&f=json
[QIND]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/1/query?where=1%3D1&outFields=OBJECTID%2Coznacenie%2Cindikatory_graf&returnGeometry=false&f=json
[QAREA]: https://services8.arcgis.com/pRlN1m0su5BYaFAS/arcgis/rest/services/BF_aktualiz%C3%A1cia_2022_WFL1/FeatureServer/8/query?where=1%3D1&outFields=OBJECTID%2CNAZOV%2CSPEC_CISLO%2CVYMERA_HA%2CZONA_OZNACENIE&returnGeometry=false&f=json
