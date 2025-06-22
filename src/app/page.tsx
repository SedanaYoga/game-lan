"use client";

import ConfigWrapper from "@/components/ConfigWrapper";
import NoteWrapper from "@/components/NoteWrapper";
import TimelineWrapper from "@/components/TimelineWrapper";
import { SAMPLER_URLS } from "@/constants/notes";
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

  const samplerRef = useRef<Tone.Sampler | null>(null);
  const [isSamplerReady, setIsSamplerReady] = useState<boolean>(false);

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
  // Initialize Sampler
  useEffect(() => {
    samplerRef.current = new Tone.Sampler({
      urls: SAMPLER_URLS,
      onload: () => {
        setIsSamplerReady(true);
        console.log("Sampler is loaded successfully!");
      },
      onerror: (error) => {
        console.error("Error loading samples:", error);
      },
    }).toDestination();

    const chorus = new Tone.Chorus(2, 1.5, 0.5).toDestination();
    samplerRef.current.connect(chorus);

    return () => {
      samplerRef.current?.dispose();
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
        samplerRef={samplerRef}
        isSamplerReady={isSamplerReady}
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
          samplerRef={samplerRef}
          isSamplerReady={isSamplerReady}
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
