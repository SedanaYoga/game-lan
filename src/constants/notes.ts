import { NoteDefinition, NoteType } from "@/types/notes.type";

export const SAMPLER_URLS: Record<string, string> = Object.fromEntries(
  Object.entries({
    D4: "gangsa-pemade-ombak/pemade-ombak-ding-low.mp3",
    E4: "gangsa-pemade-ombak/pemade-ombak-dong-low.mp3",
    G4: "gangsa-pemade-ombak/pemade-ombak-deng-low.mp3",
    A4: "gangsa-pemade-ombak/pemade-ombak-dung-low.mp3",
    C5: "gangsa-pemade-ombak/pemade-ombak-dang-low.mp3",
    D5: "gangsa-pemade-ombak/pemade-ombak-ding-high.mp3",
    E5: "gangsa-pemade-ombak/pemade-ombak-dong-high.mp3",
    G5: "gangsa-pemade-ombak/pemade-ombak-deng-high.mp3",
    A5: "gangsa-pemade-ombak/pemade-ombak-dung-high.mp3",
    C6: "gangsa-pemade-ombak/pemade-ombak-dang-high.mp3",
  }).map(([key, value]) => {
    if (process.env.CI) {
      return [key, `game-lan/${value}`];
    } else {
      return [key, value];
    }
  }),
);

export const NOTES: NoteDefinition[] = [
  { name: "Dong", pitch: "D4", type: "low" },
  { name: "Deng", pitch: "E4", type: "low" },
  { name: "Dung", pitch: "G4", type: "low" },
  { name: "Dang", pitch: "A4", type: "low" },
  { name: "Ding", pitch: "C5", type: "low" },
  { name: "Dong", pitch: "D5", type: "high" },
  { name: "Deng", pitch: "E5", type: "high" },
  { name: "Dung", pitch: "G5", type: "high" },
  { name: "Dang", pitch: "A5", type: "high" },
  { name: "Ding", pitch: "C6", type: "high" },
];

export const NOTE_COLORS: Record<NoteType, string> = {
  low: "bg-amber-700 border-amber-300",
  high: "bg-yellow-600 border-yellow-300",
};
