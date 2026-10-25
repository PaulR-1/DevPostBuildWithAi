export type MemeKind = "image" | "video";
export type MemeEnding = "bonk" | "splash" | "flashbang";

export type Meme = {
  id: string;
  name: string;
  /** Image data URL, public path, or a video object URL. */
  src: string;
  kind: MemeKind;
  ending: MemeEnding;
  /** Sound that plays before the ending. A public path or an object URL. */
  audioSrc?: string;
  /** Uploaded sound or video. Kept so a reload can build a fresh object URL. */
  media?: Blob;
};

export const MEME_MAX_SECONDS = 15;
export const MEME_LENGTH_MESSAGE = "Memes can only be up to 15 seconds.";

export const SAMPLE_MEMES: Meme[] = [
  {
    id: "tralalero",
    name: "Tralalero Tralala",
    src: "/default-memes/tralalero.png",
    kind: "image",
    ending: "splash",
    audioSrc: "/default-memes/tralalero.mp3",
  },
  {
    id: "dust-baby",
    name: "Dust Baby",
    src: "/default-memes/dust-baby.png",
    kind: "image",
    ending: "flashbang",
    audioSrc: "/default-memes/dust-baby.mp3",
  },
  {
    id: "tung-tung",
    name: "Tung Tung Tung Sahur",
    src: "/default-memes/tung-tung.jpg",
    kind: "image",
    ending: "bonk",
    audioSrc: "/default-memes/tung-tung.mp3",
  },
];

/** How many of the learner's own memes storage will hold. */
export const CUSTOM_MEME_LIMIT = 20;
export const MEME_NAME_LIMIT = 18;

const MEME_EDGE = 480;

export function memeById(id: string, memes: Meme[] = SAMPLE_MEMES): Meme {
  return memes.find((m) => m.id === id) ?? SAMPLE_MEMES[0];
}

export function isCustomMeme(id: string): boolean {
  return id.startsWith("custom-");
}

export function memeIsTooLong(seconds: number): boolean {
  return !Number.isFinite(seconds) || seconds > MEME_MAX_SECONDS;
}

export function memeNameFromFile(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return (base || "My meme").slice(0, MEME_NAME_LIMIT);
}

/** Shrinks an uploaded meme so a full storage still fits in the browser. */
export function readMemeFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not an image"));
      return;
    }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MEME_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(img.src);
        reject(new Error("no canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("unreadable"));
    };
    img.src = URL.createObjectURL(file);
  });
}

export function mediaDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
    const finish = (seconds: number | null) => {
      URL.revokeObjectURL(url);
      if (seconds === null) reject(new Error("unreadable"));
      else resolve(seconds);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => finish(el.duration);
    el.onerror = () => finish(null);
    el.src = url;
  });
}

type StoredMeme = {
  id?: unknown;
  name?: unknown;
  src?: unknown;
  kind?: unknown;
  media?: unknown;
};

/** Shape written to IndexedDB. Object URLs are left out; the blob is enough. */
export function storedMeme(meme: Meme): StoredMeme {
  return {
    id: meme.id,
    name: meme.name,
    src: meme.kind === "video" ? "" : meme.src,
    kind: meme.kind,
    media: meme.media,
  };
}

/** Rebuilds a saved meme, including one stored before sound and video existed. */
export function reviveMeme(value: unknown): Meme | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as StoredMeme;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  const kind: MemeKind = raw.kind === "video" ? "video" : "image";
  const media = raw.media instanceof Blob ? raw.media : undefined;
  let src = typeof raw.src === "string" ? raw.src : "";
  let audioSrc: string | undefined;
  if (media) {
    const url = URL.createObjectURL(media);
    if (kind === "video") src = url;
    else audioSrc = url;
  }
  if (!src) return null;
  return { id: raw.id, name: raw.name, src, kind, ending: "bonk", audioSrc, media };
}
