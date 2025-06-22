import { NOTE_COLORS } from "@/constants/notes";
import {
  DraggedItem,
  NoteDefinition,
  Timeline,
  TimelineNote,
} from "@/types/notes.type";
import { Dispatch, SetStateAction, useRef, useState, useEffect } from "react";
import { twMerge } from "tailwind-merge";

interface TimelineWrapperProps {
  timelines: Timeline[];
  draggedItem: DraggedItem | null;
  addToTimeline: (
    item: NoteDefinition | { type: "rest" },
    timelineId: string,
  ) => void;
  setDraggedItem: Dispatch<SetStateAction<DraggedItem | null>>;
  activeTimelineId: string | null;
  setActiveTimelineId: Dispatch<SetStateAction<string | null>>;
  setTimelines: Dispatch<SetStateAction<Timeline[]>>;
  isPlaying: boolean;
  currentStep: number;
  handleRemoveNote: (timelineId: string, noteId: string) => void;
  playheadPosition: number;
  setPlayheadPosition: Dispatch<SetStateAction<number>>;
}

const TimelineWrapper = ({
  timelines,
  draggedItem,
  addToTimeline,
  setDraggedItem,
  activeTimelineId,
  setActiveTimelineId,
  setTimelines,
  isPlaying,
  currentStep,
  handleRemoveNote,
  playheadPosition,
  setPlayheadPosition,
}: TimelineWrapperProps) => {
  const maxSteps = Math.max(16, ...timelines.map((tl) => tl.notes.length));
  const timelineGridRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  const handleDropOnTimeline = (e: React.DragEvent, timelineId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.sourceInfo) return;
    addToTimeline(draggedItem.item, timelineId);
    setDraggedItem(null);
  };

  const handleClearTimeline = (timelineId: string) => {
    setTimelines(
      timelines.map((tl) => (tl.id === timelineId ? { ...tl, notes: [] } : tl)),
    );
  };

  const handleDropOnNote = (
    e: React.DragEvent,
    targetTimelineId: string,
    targetNoteId: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || !draggedItem.sourceInfo) return;
    const { item: sourceItem, sourceInfo } = draggedItem;
    if (sourceInfo.timelineId !== targetTimelineId) return;

    setTimelines((currentTimelines) => {
      const newTimelines = [...currentTimelines];
      const timelineIndex = newTimelines.findIndex(
        (tl) => tl.id === targetTimelineId,
      );
      if (timelineIndex === -1) return currentTimelines;

      const notes = [...newTimelines[timelineIndex].notes];
      const sourceIndex = notes.findIndex(
        (n) => "id" in sourceItem && n.id === sourceItem.id,
      );
      if (sourceIndex === -1) return currentTimelines;

      const [movedItem] = notes.splice(sourceIndex, 1);
      const targetIndex = notes.findIndex((n) => n.id === targetNoteId);

      if (targetIndex !== -1) {
        notes.splice(targetIndex, 0, movedItem);
      } else {
        notes.push(movedItem);
      }

      const reorderedNotes = notes.map((note, index) => ({
        ...note,
        time: `0:${Math.floor(index / 4)}:${index % 4}`,
      }));
      newTimelines[timelineIndex] = {
        ...newTimelines[timelineIndex],
        notes: reorderedNotes,
      };

      return newTimelines;
    });

    setDraggedItem(null);
  };

  const handleNoteDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragStart = (
    e: React.DragEvent,
    item: NoteDefinition | { type: "rest" },
    sourceInfo: { timelineId: string } | null = null,
  ) => {
    setDraggedItem({ item, sourceInfo });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(item));
  };

  const removeTimeline = (timelineId: string) => {
    setTimelines((currentTimelines) => {
      return currentTimelines.filter((tl) => tl.id !== timelineId);
    });
  };

  const toggleMute = (timelineId: string) => {
    setTimelines((currentTimelines) =>
      currentTimelines.map((tl) =>
        tl.id === timelineId ? { ...tl, isMuted: !tl.isMuted } : tl,
      ),
    );
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead && timelineGridRef.current && !isPlaying) {
        const rect = timelineGridRef.current.getBoundingClientRect();
        // 16rem header (256px) + 2.75rem per step (44px)
        const newPosition = Math.floor((e.clientX - rect.left - 256) / 44);

        if (newPosition >= 0 && newPosition <= maxSteps) {
          setPlayheadPosition(newPosition);
        }
      }
    };
    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    if (isDraggingPlayhead) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingPlayhead, maxSteps, setPlayheadPosition, isPlaying]);

  return (
    <section className="bg-gray-800 rounded-lg p-4 flex-grow flex flex-col overflow-hidden">
      <div className="overflow-x-auto w-full h-full relative">
        {/* --- Ruler and Playback Head --- */}
        <div
          ref={timelineGridRef}
          className="sticky top-0 h-8 bg-gray-800 cursor-pointer"
          style={{ zIndex: 20 }}
          onMouseDown={(e) => {
            if (isPlaying) return;
            setIsDraggingPlayhead(true);
            if (timelineGridRef.current) {
              const rect = timelineGridRef.current.getBoundingClientRect();
              const newPosition = Math.floor(
                (e.clientX - rect.left - 256) / 44,
              );
              if (newPosition >= 0 && newPosition <= maxSteps) {
                setPlayheadPosition(newPosition);
              }
            }
          }}
        >
          <div
            className="absolute top-0 h-96 w-1 bg-cyan-400"
            style={{
              left: `calc(16rem + ${playheadPosition * 2.5}rem + ${playheadPosition * 4}px)`,
              pointerEvents: "none",
            }}
          >
            <div className="relative w-full h-full">
              <div className="absollute size-3 bg-cyan-400 rounded-r-full -top-1/2" />
            </div>
          </div>

          <div
            className="grid items-center gap-x-1 h-full"
            style={{
              gridTemplateColumns: `16rem repeat(${maxSteps}, 2.5rem)`,
            }}
          >
            <div className="sticky left-0 bg-gray-800 h-full"></div>
            {Array.from({ length: maxSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-full border-l text-center text-xs pt-1 ${i % 4 === 0 ? "border-gray-400 text-gray-400" : "border-gray-600 text-gray-600"}`}
              >
                {i % 4 === 0 ? i / 4 + 1 : "."}
              </div>
            ))}
          </div>
        </div>

        {/* --- Timelines Grid --- */}
        <div className="inline-grid gap-y-2 mt-2" style={{ minWidth: "100%" }}>
          {timelines.map((tl, index) => (
            <div
              key={tl.id}
              className="grid items-center gap-x-1"
              style={{
                gridTemplateColumns: `16rem repeat(${maxSteps}, 2.5rem)`,
              }}
            >
              {/* --- Timeline Header (Sticky) --- */}
              <div
                onDrop={(e) => handleDropOnTimeline(e, tl.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                className={twMerge(
                  ...[
                    "sticky left-0 p-2 h-full flex flex-col justify-between items-start gap-2",
                    "bg-gray-800 rounded-lg border-2 transition-colors",
                    activeTimelineId === tl.id
                      ? "bg-gray-700 border-cyan-500"
                      : "bg-gray-900/50 border-transparent",
                  ],
                )}
                style={{ zIndex: 10 }}
              >
                <h3 className="font-bold">Timeline {index + 1}</h3>

                <div className="flex gap-2 items-center shrink-0">
                  {activeTimelineId !== tl.id ? (
                    <button
                      onClick={() => setActiveTimelineId(tl.id)}
                      className="px-2 py-1 text-xs bg-cyan-800 hover:bg-cyan-700 rounded-md"
                    >
                      Activate
                    </button>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-cyan-500 rounded-md font-bold">
                      Active
                    </span>
                  )}
                  <button
                    onClick={() => handleClearTimeline(tl.id)}
                    className="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 rounded-md"
                  >
                    Clear
                  </button>

                  <button
                    onClick={() => removeTimeline(tl.id)}
                    className="px-2 py-1 text-xs bg-red-800 hover:bg-red-700 rounded-md"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => toggleMute(tl.id)}
                    className={`px-2 py-1 text-xs rounded-md ${
                      tl.isMuted
                        ? "bg-yellow-800 hover:bg-yellow-700"
                        : "bg-gray-600 hover:bg-gray-500"
                    }`}
                  >
                    {tl.isMuted ? "Unmute" : "Mute"}
                  </button>
                </div>
              </div>

              {/* --- Notes Track --- */}
              {Array.from({ length: maxSteps }).map((_, stepIndex) => {
                const item = tl.notes[stepIndex];
                return (
                  <div
                    key={stepIndex}
                    onDrop={(e) => item && handleDropOnNote(e, tl.id, item.id)}
                    onDragOver={handleNoteDragOver}
                    className={`h-12 flex-shrink-0 rounded-md ${stepIndex % 4 === 0 ? "bg-gray-900/50" : ""}`}
                  >
                    {item && (
                      <div
                        draggable="true"
                        onDragStart={(e) =>
                          handleDragStart(e, item, { timelineId: tl.id })
                        }
                        onDoubleClick={() => handleRemoveNote(tl.id, item.id)}
                        className={`w-full h-full cursor-grab active:cursor-grabbing transition-opacity hover:opacity-75 ${isPlaying && currentStep === stepIndex ? "ring-2 ring-white ring-offset-2 ring-offset-gray-800" : ""}`}
                      >
                        {item.type === "rest" ? (
                          <div className="w-full h-full rounded-md flex items-center justify-center bg-gray-700 border-2 border-gray-600">
                            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          </div>
                        ) : (
                          <div
                            className={`w-full h-full rounded-md flex flex-col items-center justify-center text-xs font-bold border-2 ${NOTE_COLORS[(item as TimelineNote).type]}`}
                          >
                            <span>{(item as TimelineNote).name}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TimelineWrapper;
