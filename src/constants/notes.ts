import { NoteDefinition, NoteType } from "@/types/notes.type";

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
  low: "bg-yellow-500 border-yellow-400",
  high: "bg-cyan-500 border-cyan-400",
};
