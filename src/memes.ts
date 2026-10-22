export type Meme = { id: string; name: string; src: string };

export const SAMPLE_MEMES: Meme[] = [
  { id: "bonk", name: "Bonk", src: "/sample-memes/bonk.svg" },
  { id: "lock-in", name: "Lock in", src: "/sample-memes/lock-in.svg" },
  { id: "caught", name: "I saw that", src: "/sample-memes/caught.svg" },
  { id: "brainrot", name: "Brainrot", src: "/sample-memes/brainrot.svg" },
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
