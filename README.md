# Bratislava Urban Data Explorer

Vzdelávací a portfóliový projekt zameraný na mestské dáta Bratislavy.
Cieľom je postupne vytvoriť interaktívnu aplikáciu o brownfieldoch a vedieť
vysvetliť celý tok od zdrojových dát cez API až po používateľské rozhranie.
Nie je to oficiálna aplikácia Metropolitného inštitútu Bratislavy.

## Aktuálny rozsah

- FastAPI backend s `GET /api/health`, ktorý vracia `{"status":"ok"}`.
- Úvodná stránka v Reacte a TypeScripte s vývojovým nástrojom Vite.
- Frontend zatiaľ nevolá backend; oba procesy sa spúšťajú samostatne.
- Mapa, databáza ani údaje o konkrétnych brownfieldoch zatiaľ nie sú súčasťou projektu.

## Štruktúra

```text
portfolio/
├── .gitignore                 # Súbory, ktoré Git nemá sledovať
├── README.md                  # Tento návod
├── backend/
│   ├── .venv/                 # Lokálny Python a balíčky (mimo Gitu)
│   ├── app/
│   │   ├── __init__.py        # Označenie Python balíčka
│   │   └── main.py            # FastAPI aplikácia a health endpoint
│   ├── requirements.in        # Zoznam priamych závislostí
│   └── requirements.txt       # Presné verzie všetkých Python závislostí
└── frontend/
    ├── src/
    │   ├── main.tsx           # Pripojí React k HTML elementu root
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
Samostatná sada automatizovaných testov zatiaľ nie je vytvorená.

## Git a citlivé údaje

Lokálny Git repozitár je inicializovaný; prvý commit zatiaľ nie je vytvorený.
Stav skontroluješ z koreňa projektu príkazom `git status`.
`.gitignore` vylučuje virtuálne prostredia, balíčky, buildy, logy,
súbory `.env`, priečinky `secrets/` a bežné formáty súkromných kľúčov.
Výnimka `.env.example` slúži iba na príklady bez skutočných hesiel.
Pred commitom vždy skontroluj obsah súborov; `.gitignore` nie je detektor secrets.

## Dokumentácia technológií

- [FastAPI – prvé kroky](https://fastapi.tiangolo.com/tutorial/first-steps/)
- [Vite – úvod a príkazy](https://vite.dev/guide/)
