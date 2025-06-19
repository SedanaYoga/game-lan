"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as Tone from "tone";

// --- Type Definitions ---

type NoteType = "low" | "high";

interface NoteDefinition {
  name: string;
  pitch: string;
  type: NoteType;
}

interface TimelineNote extends NoteDefinition {
  id: string;
  time: string;
}

interface Rest {
  id: string;
  time: string;
  type: "rest";
}

type TimelineItem = TimelineNote | Rest;

interface Timeline {
  id: string;
  notes: TimelineItem[];
}

interface DraggedItem {
  item: NoteDefinition | { type: "rest" };
  sourceInfo: { timelineId: string } | null;
}

// --- Gamelan Configuration ---
const NOTES: NoteDefinition[] = [
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

const NOTE_COLORS: Record<NoteType, string> = {
  low: "bg-yellow-500 border-yellow-400",
  high: "bg-cyan-500 border-cyan-400",
};

// --- Main App Component ---
export default function App(): React.JSX.Element {
  // --- State Management ---
  const [timelines, setTimelines] = useState<Timeline[]>([
    { id: crypto.randomUUID(), notes: [] },
  ]);
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(
    timelines.length > 0 ? timelines[0].id : null,
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [tempo, setTempo] = useState<number>(120);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);

  // --- Tone.js Refs ---
  const synthRefA = useRef<Tone.PolySynth | null>(null);
  const synthRefB = useRef<Tone.PolySynth | null>(null);
  const partPlayersRef = useRef<(Tone.Part | Tone.Loop)[]>([]);
  const playbackHeadRef = useRef<HTMLDivElement | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  // --- Effects ---
  // Initialize Synthesizers
  useEffect(() => {
    const settings: Partial<Tone.FMSynthOptions> = {
      harmonicity: 3.99,
      modulationIndex: 15,
      envelope: {
        attack: 0.001,
        decay: 1.4,
        sustain: 0.05,
        release: 1.4,
      } as Omit<Tone.EnvelopeOptions, keyof Tone.ToneAudioNodeOptions>,
      modulationEnvelope: {
        attack: 0.002,
        decay: 0.7,
        sustain: 0,
        release: 0.7,
      } as Omit<Tone.EnvelopeOptions, keyof Tone.ToneAudioNodeOptions>,
    };
    const chorus = new Tone.Chorus(4, 2.5, 0.5).toDestination().start();
    synthRefA.current = new Tone.PolySynth(Tone.FMSynth, settings).connect(
      new Tone.Panner(-0.2).connect(chorus),
    );
    synthRefA.current.set({ detune: -5 });
    synthRefB.current = new Tone.PolySynth(Tone.FMSynth, settings).connect(
      new Tone.Panner(0.2).connect(chorus),
    );
    synthRefB.current.set({ detune: 5 });

    return () => {
      synthRefA.current?.dispose();
      synthRefB.current?.dispose();
      chorus.dispose();
    };
  }, []);

  // Update Tone.Transport BPM
  useEffect(() => {
    Tone.Transport.bpm.value = tempo;
  }, [tempo]);

  // Set initial active timeline
  useEffect(() => {
    if (!activeTimelineId && timelines.length > 0) {
      setActiveTimelineId(timelines[0].id);
    }
  }, [timelines, activeTimelineId]);

  // --- Drag and Drop Handlers ---
  const handleDragStart = (
    e: React.DragEvent,
    item: NoteDefinition | { type: "rest" },
    sourceInfo: { timelineId: string } | null = null,
  ) => {
    setDraggedItem({ item, sourceInfo });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify(item));
  };

  const handleNoteDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropOnTimeline = (e: React.DragEvent, timelineId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.sourceInfo) return;
    addToTimeline(draggedItem.item, timelineId);
    setDraggedItem(null);
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

  // --- Core Handlers ---
  const addToTimeline = (
    item: NoteDefinition | { type: "rest" },
    timelineId: string,
  ) => {
    setTimelines((currentTimelines) =>
      currentTimelines.map((tl) => {
        if (tl.id === timelineId) {
          const nextStep = tl.notes.length;
          const time = `0:${Math.floor(nextStep / 4)}:${nextStep % 4}`;
          const newItem: TimelineItem = {
            ...item,
            time,
            id: crypto.randomUUID(),
          };
          return { ...tl, notes: [...tl.notes, newItem] };
        }
        return tl;
      }),
    );
  };

  const handlePaletteClick = (item: NoteDefinition | { type: "rest" }) => {
    if (activeTimelineId) {
      addToTimeline(item, activeTimelineId);
    }
  };

  const handleRemoveNote = (timelineId: string, noteId: string) => {
    setTimelines((currentTimelines) =>
      currentTimelines.map((tl) => {
        if (tl.id === timelineId) {
          const filteredNotes = tl.notes.filter((note) => note.id !== noteId);
          const updatedNotes = filteredNotes.map((note, index) => ({
            ...note,
            time: `0:${Math.floor(index / 4)}:${index % 4}`,
          }));
          return { ...tl, notes: updatedNotes };
        }
        return tl;
      }),
    );
  };

  const handlePlayStop = useCallback(async () => {
    if (Tone.context.state !== "running") await Tone.start();

    if (isPlaying) {
      Tone.Transport.stop();
      partPlayersRef.current.forEach((part) => part.dispose());
      partPlayersRef.current = [];
      setIsPlaying(false);
      setCurrentStep(-1);
      if (playbackHeadRef.current) {
        playbackHeadRef.current.style.transform = `translateX(0px)`;
      }
      return;
    }

    setIsPlaying(true);
    Tone.Transport.position = 0;

    partPlayersRef.current = timelines.map((tl) => {
      const events = tl.notes
        .filter((n): n is TimelineNote => n.type !== "rest")
        .map((note) => [note.time, note.pitch] as [string, string]);
      return new Tone.Part((time, pitch) => {
        synthRefA.current?.triggerAttackRelease(pitch, "8n", time);
        synthRefB.current?.triggerAttackRelease(pitch, "8n", time);
      }, events).start(0);
    });

    const stepLoop = new Tone.Loop((time) => {
      const [bar, beat, quarter] = (Tone.Transport.position as string)
        .split(":")
        .map(Number);
      const step = bar * 16 + beat * 4 + quarter;
      Tone.Draw.schedule(() => {
        setCurrentStep(Math.floor(step));
        if (playbackHeadRef.current) {
          const stepWidth = 44; // 2.75rem in pixels (w-10 + gap-1)
          const newX = step * stepWidth;
          playbackHeadRef.current.style.transform = `translateX(${newX}px)`;
        }
      }, time);
    }, "16n").start(0);
    partPlayersRef.current.push(stepLoop);

    const totalDuration = timelines.reduce(
      (max, tl) => Math.max(max, tl.notes.length),
      0,
    );
    if (totalDuration > 0) {
      const stopTime = Tone.Time(`0:0:${totalDuration}`).toSeconds();
      Tone.Transport.scheduleOnce(
        () => {
          Tone.Transport.stop();
          partPlayersRef.current.forEach((part) => part.dispose());
          partPlayersRef.current = [];
          setIsPlaying(false);
          setCurrentStep(-1);
          if (playbackHeadRef.current) {
            playbackHeadRef.current.style.transform = `translateX(0px)`;
          }
        },
        stopTime + Tone.Time("16n").toSeconds(),
      );
    } else {
      setIsPlaying(false);
    }

    Tone.Transport.start();
  }, [isPlaying, timelines]);

  // --- Timeline Management ---
  const handleAddTimeline = () => {
    const newTimeline: Timeline = { id: crypto.randomUUID(), notes: [] };
    setTimelines([...timelines, newTimeline]);
    setActiveTimelineId(newTimeline.id);
  };

  const handleClearTimeline = (timelineId: string) => {
    setTimelines(
      timelines.map((tl) => (tl.id === timelineId ? { ...tl, notes: [] } : tl)),
    );
  };

  const maxSteps = Math.max(16, ...timelines.map((tl) => tl.notes.length));

  // --- Render ---
  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans flex flex-col p-4 gap-4">
      <header className="w-full flex-shrink-0 bg-gray-800 rounded-lg p-4 flex flex-col sm:flex-row items-center gap-4">
        <h2 className="text-lg font-bold text-cyan-400 flex-shrink-0">
          Note Palette
        </h2>
        <div className="flex-grow grid grid-cols-5 md:grid-cols-11 gap-2 w-full">
          {NOTES.map((note) => (
            <div
              key={note.pitch}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, note)}
              onClick={() => handlePaletteClick(note)}
              className={`p-2 rounded-md text-center transition-all duration-200 border-2 border-transparent hover:border-gray-500 cursor-pointer active:scale-95 ${NOTE_COLORS[note.type]}`}
            >
              <div className="font-bold text-sm md:text-base">{note.name}</div>
              <div className="text-xs opacity-80 hidden md:block">
                {note.type}
              </div>
            </div>
          ))}
          <div
            draggable="true"
            onDragStart={(e) => handleDragStart(e, { type: "rest" })}
            onClick={() => handlePaletteClick({ type: "rest" })}
            className="bg-gray-600 hover:bg-gray-500 rounded-lg py-3 px-2 text-sm font-bold transition-colors flex items-center justify-center cursor-pointer active:scale-95"
          >
            Silence
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col gap-4 overflow-hidden">
        <section className="bg-gray-800 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlayStop}
              className={`w-24 h-16 text-lg font-bold rounded-lg flex items-center justify-center transition-colors ${isPlaying ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"}`}
            >
              {isPlaying ? "Stop" : "Play"}
            </button>
            <div className="flex-grow bg-gray-700 rounded-lg p-3">
              <label htmlFor="tempo" className="text-sm text-gray-400">
                Tempo: <span className="font-bold text-white">{tempo}</span> BPM
              </label>
              <input
                id="tempo"
                type="range"
                min="40"
                max="240"
                value={tempo}
                onChange={(e) => setTempo(Number(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
          <div className="flex gap-2 col-start-1 lg:col-start-3">
            <button
              onClick={handleAddTimeline}
              className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-3 rounded-lg transition-colors"
            >
              New Timeline
            </button>
          </div>
        </section>

        <section className="bg-gray-800 rounded-lg p-4 flex-grow flex flex-col overflow-hidden">
          <div
            ref={timelineContainerRef}
            className="overflow-x-auto w-full h-full relative"
          >
            {/* --- Ruler and Playback Head --- */}
            <div
              className="sticky top-0 h-8 bg-gray-800"
              style={{ zIndex: 20 }}
            >
              <div
                className="grid items-center gap-x-1 h-full"
                style={{
                  gridTemplateColumns: `14rem repeat(${maxSteps}, 2.75rem)`,
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
              <div
                ref={playbackHeadRef}
                className="absolute top-0 w-0.5 h-full bg-red-500 transition-transform duration-75 ease-linear"
                style={{ left: "14rem", height: "1000%" }}
              ></div>
            </div>

            {/* --- Timelines Grid --- */}
            <div
              className="inline-grid gap-y-2 mt-2"
              style={{ minWidth: "100%" }}
            >
              {timelines.map((tl, index) => (
                <div
                  key={tl.id}
                  className="grid items-center gap-x-1"
                  style={{
                    gridTemplateColumns: `14rem repeat(${maxSteps}, 2.75rem)`,
                  }}
                >
                  {/* --- Timeline Header (Sticky) --- */}
                  <div
                    onDrop={(e) => handleDropOnTimeline(e, tl.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    className={`sticky left-0 bg-gray-800 p-2 h-full flex justify-between items-center rounded-lg border-2 transition-colors ${activeTimelineId === tl.id ? "bg-gray-700 border-cyan-500" : "bg-gray-900/50 border-transparent"}`}
                    style={{ zIndex: 10 }}
                  >
                    <h3 className="font-bold">Timeline {index + 1}</h3>
                    <div className="flex gap-2 items-center">
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
                    </div>
                  </div>
                  {/* --- Notes Track --- */}
                  {Array.from({ length: maxSteps }).map((_, stepIndex) => {
                    const item = tl.notes[stepIndex];
                    return (
                      <div
                        key={stepIndex}
                        onDrop={(e) =>
                          item && handleDropOnNote(e, tl.id, item.id)
                        }
                        onDragOver={handleNoteDragOver}
                        className={`h-12 w-10 flex-shrink-0 rounded-md ${stepIndex % 4 === 0 ? "bg-gray-900/50" : ""}`}
                      >
                        {item && (
                          <div
                            draggable="true"
                            onDragStart={(e) =>
                              handleDragStart(e, item, { timelineId: tl.id })
                            }
                            onDoubleClick={() =>
                              handleRemoveNote(tl.id, item.id)
                            }
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
      </main>
    </div>
  );
}
