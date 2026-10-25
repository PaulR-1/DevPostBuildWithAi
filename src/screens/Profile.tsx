import { useEffect, useRef, useState, type ChangeEvent, type TransitionEvent } from "react";
import type { Meme } from "../memes";
import MemePreview from "./MemePreview";
import { getSetting, setSetting } from "../storage/focusDb";
import { useDialog } from "./useDialog";
import type { PresencePhase } from "./usePresence";

export type ProfileData = { photo?: string; favouriteMemeId?: string; name?: string };

const PHOTO_SIZE = 256;
const NAME_LIMIT = 24;

/** Shrinks the chosen photo to a small square so it stores quickly. */
function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = PHOTO_SIZE;
      const side = Math.min(img.width, img.height);
      canvas.getContext("2d")!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function Profile({
  memes,
  onClose,
  onChange,
  phase,
  onTransitionEnd,
}: {
  memes: Meme[];
  onClose: () => void;
  onChange: (profile: ProfileData) => void;
  phase: PresencePhase;
  onTransitionEnd: (event: TransitionEvent<HTMLElement>) => void;
}) {
  const [profile, setProfile] = useState<ProfileData>({});
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const edited = useRef(false);
  const dialogRef = useDialog(onClose);

  useEffect(() => {
    let cancelled = false;
    getSetting<ProfileData>("profile").then((p) => {
      if (!cancelled && p && !edited.current) setProfile(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const edit = (change: Partial<ProfileData>, remove: (keyof ProfileData)[] = []) => {
    edited.current = true;
    setProfile((prev) => {
      const next: ProfileData = { ...prev, ...change };
      for (const key of remove) delete next[key];
      return next;
    });
    setConfirmRemove(false);
  };

  const save = () => {
    const next: ProfileData = { ...profile };
    if (!next.name?.trim()) delete next.name;
    else next.name = next.name.trim();
    setSetting("profile", next);
    onChange(next);
    onClose();
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      edit({ photo: await readPhoto(file) });
    } catch {
      // A photo that can't be read stays as it was.
    }
  };

  const favourite = memes.find((meme) => meme.id === profile.favouriteMemeId) ?? null;

  return (
    <div className="settings-backdrop" data-phase={phase} onTransitionEnd={onTransitionEnd} onClick={onClose}>
      <div className="settings" data-phase={phase} ref={dialogRef} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <h2 id="profile-title">Profile</h2>

        <div className="profile-hero">
          <div className="profile-photo-wrap">
            <button className="profile-photo" onClick={() => fileInput.current?.click()} aria-label={profile.photo ? "Change profile photo" : "Add profile photo"}>
              {profile.photo ? <img src={profile.photo} alt="" /> : <span>Add</span>}
              <span className="profile-photo-change" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8.5h2.2l1.3-2h8.9l1.3 2H20a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1z" />
                  <circle cx="12" cy="13.5" r="3.1" />
                </svg>
              </span>
            </button>
            {profile.photo && (
              <button className="profile-photo-delete" aria-label="Remove photo" onClick={() => setConfirmRemove(true)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4.5 7h15" />
                  <path d="M9 7V5.2A1.2 1.2 0 0 1 10.2 4h3.6A1.2 1.2 0 0 1 15 5.2V7" />
                  <path d="M7 7l.8 12.2A1.2 1.2 0 0 0 9 20.4h6a1.2 1.2 0 0 0 1.2-1.2L17 7" />
                </svg>
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPhoto} />
          {confirmRemove && (
            <div className="settings-confirm">
              <span>Remove this photo?</span>
              <div className="settings-confirm-actions">
                <button className="text-button" onClick={() => setConfirmRemove(false)}>
                  Cancel
                </button>
                <button className="pill-button pill-button--danger" onClick={() => edit({}, ["photo"])}>
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        <label className="profile-field">
          Name
          <input
            value={profile.name ?? ""}
            maxLength={NAME_LIMIT}
            placeholder="What should we call you?"
            onChange={(e) => edit({ name: e.target.value.slice(0, NAME_LIMIT) })}
          />
        </label>

        <div className="profile-favourite">
          <span className="muted">Favourite meme</span>
          <p className="muted">A display only. It does not pick the meme that bonks you.</p>
          <div className="profile-favourite-pick">
            {favourite && <MemePreview meme={favourite} />}
            <select
              id="favourite-meme"
              aria-label="Favourite meme"
              value={profile.favouriteMemeId ?? ""}
              onChange={(e) => (e.target.value ? edit({ favouriteMemeId: e.target.value }) : edit({}, ["favouriteMemeId"]))}
            >
              <option value="">None yet</option>
              {memes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {favourite && (
              <button className="pill-button" onClick={() => edit({}, ["favouriteMemeId"])}>
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="profile-actions">
          <button className="pill-button pill-button--primary" onClick={save}>
            Save
          </button>
          <button className="pill-button" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
