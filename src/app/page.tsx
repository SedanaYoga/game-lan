"use client";

import ConfigWrapper from "@/components/ConfigWrapper";
import NoteWrapper from "@/components/NoteWrapper";
import TimelineWrapper from "@/components/TimelineWrapper";
import { gilakPembukaTimelines } from "@/data/test";
import {
  DraggedItem,
  NoteDefinition,
  Timeline,
  TimelineItem,
} from "@/types/notes.type";
import { useState, useEffect, useRef } from "react";
import * as Tone from "tone";

export default function Home() {
  const [timelines, setTimelines] = useState<Timeline[]>(
    gilakPembukaTimelines as Timeline[],
  );
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(
    timelines.length > 0 ? timelines[0].id : null,
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(-1);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);

  const synthRefA = useRef<Tone.PolySynth | null>(null);
  const synthRefB = useRef<Tone.PolySynth | null>(null);

  const addToTimeline = (
    item: NoteDefinition | { type: "rest" },
    timelineId: string,
  ) => {
    setTimelines((currentTimelines) =>
      currentTimelines.map((timeline) => {
        if (timeline.id === timelineId) {
          const nextStep = timeline.notes.length;
          const time = `0:${Math.floor(nextStep / 4)}:${nextStep % 4}`;
          const newItem: TimelineItem = {
            ...item,
            time,
            id: crypto.randomUUID(),
          };

          return { ...timeline, notes: [...timeline.notes, newItem] };
        }

        return timeline;
      }),
    );
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

  // Set initial active timeline
  useEffect(() => {
    if (!activeTimelineId && timelines.length > 0) {
      setActiveTimelineId(timelines[0].id);
    }
  }, [timelines, activeTimelineId]);

  return (
    <div className="bg-gray-900 min-h-screen text-white font-sans flex flex-col p-4 gap-4">
      <NoteWrapper
        setDraggedItem={setDraggedItem}
        activeTimelineId={activeTimelineId}
        addToTimeline={addToTimeline}
        synthRefA={synthRefA}
        synthRefB={synthRefB}
        handleRemoveNote={handleRemoveNote}
        timelines={timelines}
        setTimelines={setTimelines}
      />

      <main className="flex-grow flex flex-col gap-4 overflow-hidden">
        <ConfigWrapper
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          setCurrentStep={setCurrentStep}
          timelines={timelines}
          synthRefA={synthRefA}
          synthRefB={synthRefB}
          setTimelines={setTimelines}
          setActiveTimelineId={setActiveTimelineId}
        />

        <TimelineWrapper
          timelines={timelines}
          draggedItem={draggedItem}
          addToTimeline={addToTimeline}
          setDraggedItem={setDraggedItem}
          activeTimelineId={activeTimelineId}
          setActiveTimelineId={setActiveTimelineId}
          setTimelines={setTimelines}
          isPlaying={isPlaying}
          currentStep={currentStep}
          handleRemoveNote={handleRemoveNote}
        />
      </main>
    </div>
  );
}
