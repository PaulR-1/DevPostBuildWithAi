export type Meme = { id: string; name: string; src: string };

export const SAMPLE_MEMES: Meme[] = [
  { id: "bonk", name: "Bonk", src: "/sample-memes/bonk.svg" },
  { id: "lock-in", name: "Lock in", src: "/sample-memes/lock-in.svg" },
  { id: "caught", name: "I saw that", src: "/sample-memes/caught.svg" },
  { id: "brainrot", name: "Brainrot", src: "/sample-memes/brainrot.svg" },
];

export function memeById(id: string): Meme {
  return SAMPLE_MEMES.find((m) => m.id === id) ?? SAMPLE_MEMES[0];
}
