export default function Home({ onStart }: { onStart: () => void }) {
  return (
    <main className="home">
      <header className="home-header">
        <img className="app-icon" src="/app-icon.svg" alt="" />
        <h1>FocusRot</h1>
      </header>

      <section className="home-card">
        <h2>Past sessions</h2>
        <p className="muted">Nothing here yet. Press start to begin your first session.</p>
      </section>

      <button className="start-button" onClick={onStart}>
        Start
      </button>
    </main>
  );
}
