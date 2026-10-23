import { useRef, useState, type ChangeEvent } from "react";
import { CUSTOM_MEME_LIMIT, isCustomMeme, MEME_NAME_LIMIT, memeNameFromFile, readMemeFile, type Meme } from "../memes";

export default function MemeStorage({
  memes,
  chosenId,
  onChoose,
  onAdd,
  onRemove,
}: {
  memes: Meme[];
  chosenId: string;
  onChoose: (id: string) => void;
  onAdd: (meme: Meme) => Promise<void>;
  onRemove: (id: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ src: string; name: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const customCount = memes.filter((meme) => isCustomMeme(meme.id)).length;
  const full = customCount >= CUSTOM_MEME_LIMIT;
  const confirming = memes.find((meme) => meme.id === confirmId) ?? null;

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setDraft({ src: await readMemeFile(file), name: memeNameFromFile(file) });
      setConfirmId(null);
      setError(null);
    } catch {
      setError("That image couldn't be added.");
    }
  };

  const addDraft = async () => {
    if (!draft || saving) return;
    const name = draft.name.trim().slice(0, MEME_NAME_LIMIT) || "My meme";
    setSaving(true);
    try {
      await onAdd({ id: `custom-${crypto.randomUUID()}`, name, src: draft.src });
      setDraft(null);
      setError(null);
    } catch {
      setError("The browser's storage is full, so that meme wasn't saved. Remove one and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="home-card home-card--memes">
      <h2>Meme storage</h2>
      <p className="muted">{full ? "Storage holds 20 of your own memes." : "Pick the meme that bonks you this session."}</p>
      <div className="meme-grid">
        {memes.map((meme) => (
          <div className="meme-slot" key={meme.id}>
            <button
              className={`meme-choice ${meme.id === chosenId ? "meme-choice--chosen" : ""}`}
              onClick={() => onChoose(meme.id)}
              aria-pressed={meme.id === chosenId}
            >
              <img src={meme.src} alt="" />
              <span>{meme.name}</span>
            </button>
            {isCustomMeme(meme.id) && (
              <button className="meme-remove" aria-label={`Remove ${meme.name}`} onClick={() => { setConfirmId(meme.id); setDraft(null); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <button
          className="meme-add"
          onClick={() => fileInput.current?.click()}
          disabled={full}
          aria-label={full ? "Meme storage is full" : "Add a meme"}
        >
          <span className="meme-add-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span>{full ? "Full" : "Add"}</span>
        </button>
      </div>
      <input ref={fileInput} className="meme-file" type="file" accept="image/*" hidden onChange={onFile} />
      {error && <p className="meme-note meme-note--error">{error}</p>}
      {draft && (
        <div className="meme-draft">
          <img src={draft.src} alt="" />
          <label>
            Name
            <input
              value={draft.name}
              maxLength={MEME_NAME_LIMIT}
              aria-label="Meme name"
              onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, MEME_NAME_LIMIT) })}
              onKeyDown={(e) => {
                if (e.key === "Enter") addDraft();
              }}
            />
          </label>
          <div className="meme-draft-actions">
            <button className="text-button" onClick={() => setDraft(null)}>
              Cancel
            </button>
            <button className="pill-button pill-button--primary" onClick={addDraft} disabled={saving}>
              {saving ? "Saving…" : "Add"}
            </button>
          </div>
        </div>
      )}
      {confirming && (
        <div className="settings-confirm meme-confirm">
          <span>Remove {confirming.name}?</span>
          <div className="settings-confirm-actions">
            <button className="text-button" onClick={() => setConfirmId(null)}>
              Cancel
            </button>
            <button
              className="pill-button pill-button--danger"
              onClick={() => {
                onRemove(confirming.id);
                setConfirmId(null);
              }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
