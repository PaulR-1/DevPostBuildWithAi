import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { memeById, SAMPLE_MEMES } from "../memes";
import { getSetting, setSetting } from "../storage/focusDb";

export type ProfileData = { photo?: string; favouriteMemeId?: string };

const PHOTO_SIZE = 256;

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

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData>({});
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSetting<ProfileData>("profile").then((p) => p && setProfile(p));
  }, []);

  const save = (change: ProfileData) => {
    setProfile((prev) => {
      const next = { ...prev, ...change };
      setSetting("profile", next);
      return next;
    });
  };

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) save({ photo: await readPhoto(file) });
  };

  const favourite = profile.favouriteMemeId ? memeById(profile.favouriteMemeId) : null;

  return (
    <section className="home-card profile">
      <h2>Profile</h2>
      <div className="profile-row">
        <button className="profile-photo" onClick={() => fileInput.current?.click()} aria-label="Change profile photo">
          {profile.photo ? <img src={profile.photo} alt="" /> : <span>+ Photo</span>}
        </button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPhoto} />

        <div className="profile-favourite">
          <label htmlFor="favourite-meme" className="muted">
            Favourite meme
          </label>
          <div className="profile-favourite-pick">
            {favourite && <img src={favourite.src} alt="" />}
            <select
              id="favourite-meme"
              value={profile.favouriteMemeId ?? ""}
              onChange={(e) => save({ favouriteMemeId: e.target.value || undefined })}
            >
              <option value="">None yet</option>
              {SAMPLE_MEMES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}
