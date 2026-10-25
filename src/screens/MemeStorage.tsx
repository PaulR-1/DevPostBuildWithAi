import { useRef, useState, type ChangeEvent } from "react";
import {
  CUSTOM_MEME_LIMIT,
  isCustomMeme,
  mediaDuration,
  MEME_LENGTH_MESSAGE,
  MEME_NAME_LIMIT,
  memeIsTooLong,
  memeNameFromFile,
  readMemeFile,
  type Meme,
} from "../memes";
import MemePreview from "./MemePreview";

type Step = "closed" | "pick" | "sound" | "draft";
type Draft = { name: string; kind: Meme["kind"]; src: string; media?: Blob };

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
  const imageInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("closed");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const customCount = memes.filter((meme) => isCustomMeme(meme.id)).length;
  const full = customCount >= CUSTOM_MEME_LIMIT;
  const confirming = memes.find((meme) => meme.id === confirmId) ?? null;

  const closeDraft = () => {
    if (draft?.kind === "video") URL.revokeObjectURL(draft.src);
    setDraft(null);
    setStep("closed");
  };

  const onImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setDraft({ src: await readMemeFile(file), name: memeNameFromFile(file), kind: "image" });
      setStep("sound");
      setConfirmId(null);
      setError(null);
    } catch {
      setError("That image couldn't be added.");
    }
  };

  const onAudio = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !draft) return;
    try {
      const seconds = await mediaDuration(file);
      if (memeIsTooLong(seconds)) {
        setError(MEME_LENGTH_MESSAGE);
        return;
      }
      setDraft({ ...draft, media: file });
      setStep("draft");
      setError(null);
    } catch {
      setError("That sound couldn't be added.");
    }
  };

  const onVideo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const seconds = await mediaDuration(file);
      if (memeIsTooLong(seconds)) {
        setError(MEME_LENGTH_MESSAGE);
        return;
      }
      setDraft({ src: URL.createObjectURL(file), name: memeNameFromFile(file), kind: "video", media: file });
      setStep("draft");
      setConfirmId(null);
      setError(null);
    } catch {
      setError("That video couldn't be added.");
    }
  };

  const addDraft = async () => {
    if (!draft || saving) return;
    const name = draft.name.trim().slice(0, MEME_NAME_LIMIT) || "My meme";
    const meme: Meme = {
      id: `custom-${crypto.randomUUID()}`,
      name,
      src: draft.src,
      kind: draft.kind,
      ending: "bonk",
      media: draft.media,
      audioSrc: draft.kind === "image" && draft.media ? URL.createObjectURL(draft.media) : undefined,
    };
    setSaving(true);
    try {
      await onAdd(meme);
      setDraft(null);
      setStep("closed");
      setError(null);
    } catch {
      if (meme.audioSrc) URL.revokeObjectURL(meme.audioSrc);
      setError("The browser's storage is full, so that meme wasn't saved. Remove one and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="home-card home-card--memes">
      <h2>Meme storage</h2>
      <p className="muted">
        {full ? "Storage holds 20 of your own memes." : `Pick the meme that bonks you this session. ${MEME_LENGTH_MESSAGE}`}
      </p>
      <div className="meme-grid">
        {memes.map((meme) => (
          <div className="meme-slot" key={meme.id}>
            <button
              className={`meme-choice ${meme.id === chosenId ? "meme-choice--chosen" : ""}`}
              onClick={() => onChoose(meme.id)}
              aria-pressed={meme.id === chosenId}
            >
              <MemePreview meme={meme} />
              <span>{meme.name}</span>
            </button>
            {isCustomMeme(meme.id) && (
              <button className="meme-remove" aria-label={`Remove ${meme.name}`} onClick={() => { setConfirmId(meme.id); closeDraft(); }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <button
          className="meme-add"
          onClick={() => {
            setError(null);
            setConfirmId(null);
            setStep("pick");
          }}
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
      <input ref={imageInput} className="meme-file" type="file" accept="image/*" hidden onChange={onImage} />
      <input ref={audioInput} className="meme-file" type="file" accept="audio/*" hidden onChange={onAudio} />
      <input ref={videoInput} className="meme-file" type="file" accept="video/*" hidden onChange={onVideo} />
      {error && <p className="meme-note meme-note--error">{error}</p>}
      {step !== "closed" && (
        <div className="meme-add-card">
          {step === "pick" && (
            <>
              <p>Add a picture or a video. {MEME_LENGTH_MESSAGE}</p>
              <div className="meme-draft-actions">
                <button className="pill-button" onClick={() => imageInput.current?.click()}>
                  Picture
                </button>
                <button className="pill-button" onClick={() => videoInput.current?.click()}>
                  Video
                </button>
                <button className="text-button" onClick={() => setStep("closed")}>
                  Cancel
                </button>
              </div>
            </>
          )}
          {draft && step !== "pick" && (
            <>
              <MemePreview className="meme-add-card-preview" meme={{ ...draft, id: "draft", ending: "bonk" }} />
              <label>
                Name
                <input
                  value={draft.name}
                  maxLength={MEME_NAME_LIMIT}
                  aria-label="Meme name"
                  onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, MEME_NAME_LIMIT) })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && step === "draft") addDraft();
                  }}
                />
              </label>
              {step === "sound" && <p>Add a sound for this picture? Skip it and a short tune plays, then the bonk.</p>}
              <div className="meme-draft-actions">
                {step === "sound" && (
                  <>
                    <button className="pill-button pill-button--primary" onClick={() => audioInput.current?.click()}>
                      Add a sound
                    </button>
                    <button className="pill-button" onClick={() => setStep("draft")}>
                      Use default sound
                    </button>
                  </>
                )}
                {step === "draft" && (
                  <button className="pill-button pill-button--primary" onClick={addDraft} disabled={saving}>
                    {saving ? "Saving…" : "Add"}
                  </button>
                )}
                <button className="text-button" onClick={closeDraft}>
                  Cancel
                </button>
              </div>
            </>
          )}
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
