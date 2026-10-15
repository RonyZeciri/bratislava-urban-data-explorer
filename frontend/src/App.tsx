import './App.css'

function App() {
  return (
    <main className="page">
      <header className="project-header">
        <span className="project-mark" aria-hidden="true">BA</span>
        <span>Osobný programátorský projekt</span>
      </header>

      <section className="intro" aria-labelledby="project-title">
        <p className="eyebrow">Mesto · dáta · súvislosti</p>
        <h1 id="project-title">Bratislava Urban Data Explorer</h1>
        <p className="lead">
          Priestor na skúmanie mestských dát a lepšie pochopenie Bratislavy.
        </p>
        <p className="description">
          Cieľom projektu je postupne sprístupniť verejné údaje o brownfieldoch
          Bratislavy v zrozumiteľnej interaktívnej aplikácii. Portfólio prepája
          vývoj webového rozhrania, backendového API a spracovanie geografických dát.
        </p>
      </section>

      <section className="project-status" aria-labelledby="status-title">
        <p className="eyebrow">Aktuálna etapa</p>
        <h2 id="status-title">Základ projektu</h2>
        <p>
          Pripravujeme technický základ aplikácie. Mapa, dátové vrstvy
          a detaily lokalít pribudnú v ďalších krokoch po overení zdrojov.
        </p>
      </section>

      <footer>
        Nezávislý vzdelávací a portfóliový projekt. Nie je oficiálnou aplikáciou MIB.
      </footer>
    </main>
  )
}

export default App
