// --- Type Definitions ---

export type NoteType = "low" | "high";

export interface NoteDefinition {
  name: string;
  pitch: string;
  type: NoteType;
}

export interface TimelineNote extends NoteDefinition {
  id: string;
  time: string;
}

export interface Rest {
  id: string;
  time: string;
  type: "rest";
}

export type TimelineItem = TimelineNote | Rest;

export interface Timeline {
  id: string;
  notes: TimelineItem[];
  isMuted?: boolean;
}

export interface DraggedItem {
  item: NoteDefinition | { type: "rest" };
  sourceInfo: { timelineId: string } | null;
}
