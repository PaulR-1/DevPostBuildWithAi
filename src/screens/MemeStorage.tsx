import { SAMPLE_MEMES } from "../memes";

export default function MemeStorage({ chosenId, onChoose }: { chosenId: string; onChoose: (id: string) => void }) {
  return (
    <section className="home-card">
      <h2>Meme storage</h2>
      <p className="muted">Pick the meme that bonks you this session.</p>
      <div className="meme-grid">
        {SAMPLE_MEMES.map((meme) => (
          <button
            key={meme.id}
            className={`meme-choice ${meme.id === chosenId ? "meme-choice--chosen" : ""}`}
            onClick={() => onChoose(meme.id)}
            aria-pressed={meme.id === chosenId}
          >
            <img src={meme.src} alt="" />
            <span>{meme.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
