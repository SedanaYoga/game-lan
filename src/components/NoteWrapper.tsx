import { NOTE_COLORS, NOTES } from "@/constants/notes";
import { twMerge } from "tailwind-merge";
import {
  gilakPembukaTimelines,
  gilakPenutupTimelines,
  selisirTimelines,
} from "@/data/test";
import { DraggedItem, NoteDefinition, Timeline } from "@/types/notes.type";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useState,
} from "react";
import * as Tone from "tone";

interface NoteWrapperProps {
  setDraggedItem: Dispatch<SetStateAction<DraggedItem | null>>;
  activeTimelineId: string | null;
  addToTimeline: (
    item: NoteDefinition | { type: "rest" },
    timelineId: string,
  ) => void;
  handleRemoveNote: (timelineId: string, noteId: string) => void;
  timelines: Timeline[];
  setTimelines: Dispatch<SetStateAction<Timeline[]>>;
  samplerRef: RefObject<Tone.Sampler | null>;
  isSamplerReady: boolean;
}

const NoteWrapper = ({
  setDraggedItem,
  activeTimelineId,
  addToTimeline,
  handleRemoveNote,
  timelines,
  setTimelines,
  samplerRef,
  isSamplerReady,
}: NoteWrapperProps) => {
  const [hitNote, setHitNote] = useState<string | null>(null);
  const handleDragStart = (
    e: React.DragEvent,
    item: NoteDefinition | { type: "rest" },
    sourceInfo: { timelineId: string } | null = null,
  ) => {
    setDraggedItem({ item, sourceInfo });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(item));
  };

  const handlePaletteClick = useCallback(
    async (item: NoteDefinition | { type: "rest" }) => {
      if (activeTimelineId) {
        addToTimeline(item, activeTimelineId);
        if (item.type === "rest") return;
        if (!isSamplerReady) return;
        if (Tone.getContext().state !== "running") await Tone.start();
        samplerRef.current?.triggerAttackRelease([item.pitch], "2n");
        setHitNote(item.pitch);
        setTimeout(() => {
          setHitNote(null);
        }, 1000);
      }
    },
    [activeTimelineId, addToTimeline, isSamplerReady, samplerRef],
  );

  useEffect(() => {
    if (hitNote) {
      setTimeout(() => {}, 500);
    }
  }, [hitNote]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger shortcuts if an input field is focused
      if (
        !isSamplerReady ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const keyMap: Record<string, number> = {
        a: 0,
        s: 1,
        d: 2,
        f: 3,
        g: 4,
        h: 5,
        j: 6,
        k: 7,
        l: 8,
        ";": 9,
      };

      if (e.key in keyMap) {
        const note = NOTES[keyMap[e.key]];
        if (note) {
          handlePaletteClick(note);
        }
      } else if (e.key === " ") {
        e.preventDefault(); // Prevent browser back navigation
        handlePaletteClick({ type: "rest" });
      } else if (e.key === "Backspace" || e.key === "Delete") {
        // Handle note deletion
        if (activeTimelineId) {
          const selectedTimeline = timelines.find(
            (timeline) => timeline.id === activeTimelineId,
          );
          const timelineNotes = selectedTimeline?.notes;
          if (!timelineNotes?.length || !timelineNotes.at(-1)?.id) return;
          handleRemoveNote(activeTimelineId, timelineNotes.at(-1)!.id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeTimelineId,
    handlePaletteClick,
    handleRemoveNote,
    isSamplerReady,
    timelines,
  ]);

  const useSelisir = () => {
    setTimelines(selisirTimelines as Timeline[]);
  };
  const useGilakPembuka = () => {
    setTimelines(gilakPembukaTimelines as Timeline[]);
  };
  const useGilakPenutup = () => {
    setTimelines(gilakPenutupTimelines as Timeline[]);
  };

  return (
    <header className="w-full flex-shrink-0 bg-gray-800 rounded-lg p-4 flex flex-col items-center gap-4">
      <div className="flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold flex-shrink-0">Gamelan Bali Gangsa</h2>
      </div>

      <div className="flex flex-row items-center gap-3 text-sm">
        <button onClick={useSelisir}>Selisir</button>
        <button onClick={useGilakPembuka}>Gilak Pembuka</button>
        <button onClick={useGilakPenutup}>Gilak Penutup</button>
      </div>

      <div
        className={twMerge(
          ...[
            "flex flex-col items-center justify-center w-full gap-5",
            "sm:flex-row sm:h-64 sm:gap-2 md:w-[700px] sm:w-[500px]",
          ],
        )}
      >
        <div
          draggable="true"
          onDragStart={(e) => handleDragStart(e, { type: "rest" })}
          onClick={() => handlePaletteClick({ type: "rest" })}
          className={twMerge(
            ...[
              "flex flex-col items-center py-3 w-full rounded-md text-xs h-full",
              "transition-all ease-out",
              "bg-white border-white text-black",
              "sm:text-sm",
            ],
          )}
          role="button"
        >
          <span className={`font-bold text-black`}>Silence</span>
        </div>

        {NOTES.map((note, index) => (
          <div
            key={note.pitch}
            draggable="true"
            onDragStart={(e) => handleDragStart(e, note)}
            onClick={() => handlePaletteClick(note)}
            style={{ height: `${100 - index * 3}%` }}
            role="button"
            className={twMerge(
              ...[
                "flex flex-col items-center py-3 w-full rounded-md text-xs",
                "transition-all ease-out",
                hitNote === note.pitch
                  ? "bg-white border-white"
                  : NOTE_COLORS[note.type],
                "sm:text-sm",
              ],
            )}
          >
            <span
              className={`font-bold ${hitNote === note.pitch ? "text-black" : ""}`}
            >
              {note.name}
            </span>

            <span
              className={`opacity-80 md:block ${hitNote === note.pitch ? "text-black" : "text-white"}`}
            >
              {note.type}
            </span>
          </div>
        ))}
      </div>
    </header>
  );
};

export default NoteWrapper;
