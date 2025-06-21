import { Timeline, TimelineNote } from "@/types/notes.type";
import {
  Dispatch,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { twMerge } from "tailwind-merge";
import * as Tone from "tone";
import { Time } from "tone/build/esm/core/type/Units";

interface ConfigWrapperProps {
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  timelines: Timeline[];
  setTimelines: Dispatch<SetStateAction<Timeline[]>>;
  setActiveTimelineId: Dispatch<SetStateAction<string | null>>;
  samplerRef: RefObject<Tone.Sampler | null>;
  isSamplerReady: boolean;
}

const ConfigWrapper = ({
  isPlaying,
  setIsPlaying,
  setCurrentStep,
  timelines,
  setTimelines,
  setActiveTimelineId,
  samplerRef,
  isSamplerReady,
}: ConfigWrapperProps) => {
  const partPlayersRef = useRef<(Tone.Part | Tone.Loop)[]>([]);
  const [tempo, setTempo] = useState<number>(120);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const handlePlayStop = useCallback(async () => {
    if (!isSamplerReady) return;
    if (Tone.getContext().state !== "running") await Tone.start();
    const transport = Tone.getTransport();
    const draw = Tone.getDraw();

    if (isPlaying) {
      transport.stop();
      partPlayersRef.current.forEach((part) => part.dispose());
      partPlayersRef.current = [];
      setIsPlaying(false);
      setCurrentStep(-1);
      return;
    }

    setIsPlaying(true);
    transport.position = 0;

    partPlayersRef.current = timelines.map((timeline) => {
      const eventsWithDuration: {
        time: string;
        pitch: string;
        duration: number | string;
      }[] = [];

      for (let i = 0; i < timeline.notes.length; i++) {
        const currentItem = timeline.notes[i];
        if (currentItem.type === "rest") {
          continue;
        }

        // Find the next actual note to determine the duration
        let nextNoteIndex = -1;
        for (let j = i + 1; j < timeline.notes.length; j++) {
          if (timeline.notes[j].type !== "rest") {
            nextNoteIndex = j;
            break;
          }
        }

        let duration: number | string;
        if (nextNoteIndex !== -1) {
          const stepsBetween = nextNoteIndex - i;
          if (tempo < 180) {
            duration = Tone.Time("20n").toSeconds() * stepsBetween;
          } else if (tempo >= 180) {
            duration = Tone.Time("24n").toSeconds() * stepsBetween;
          } else {
            duration = Tone.Time("48n").toSeconds() * stepsBetween;
          }
        } else {
          // Default duration for the last note in the sequence
          duration = "8n";
        }

        eventsWithDuration.push({
          time: currentItem.time,
          pitch: (currentItem as TimelineNote).pitch,
          duration,
        });
      }

      return new Tone.Part((time, value) => {
        samplerRef.current?.triggerAttackRelease(
          value.pitch,
          value.duration,
          time,
        );
      }, eventsWithDuration).start(0);
      // const events = timeline.notes
      //   .filter((note): note is TimelineNote => note.type !== "rest")
      //   .map((note) => [note.time, note.pitch] as [string, string]);
      // return new Tone.Part((time, pitch) => {
      //   samplerRef.current?.triggerAttackRelease(pitch, "2n", time);
      // }, events).start(0);
    });

    const stepLoop = new Tone.Loop((time) => {
      const [bar, beat, quarter] = (transport.position as string)
        .split(":")
        .map(Number);
      const step = bar * 16 + beat * 4 + quarter;
      draw.schedule(() => {
        setCurrentStep(Math.floor(step));
      }, time);
    }, "16n").start(0);
    partPlayersRef.current.push(stepLoop);

    const totalDuration = timelines.reduce(
      (max, tl) => Math.max(max, tl.notes.length),
      0,
    );

    transport.loop = isLooping;

    if (isLooping) {
      transport.loopStart = 0;
      transport.loopEnd = Tone.Time(`0:0:${totalDuration}`) as Time;
    } else {
      if (totalDuration > 0) {
        const stopTime = Tone.Time(`0:0:${totalDuration}`).toSeconds();
        transport.scheduleOnce(
          () => {
            transport.stop();
            partPlayersRef.current.forEach((part) => part.dispose());
            partPlayersRef.current = [];
            setIsPlaying(false);
            setCurrentStep(-1);
          },
          stopTime + Tone.Time("16n").toSeconds(),
        );
      } else {
        setIsPlaying(false);
      }
    }

    transport.start();
  }, [
    isLooping,
    isPlaying,
    isSamplerReady,
    samplerRef,
    setCurrentStep,
    setIsPlaying,
    tempo,
    timelines,
  ]);

  const handleAddTimeline = () => {
    const newTimeline: Timeline = { id: crypto.randomUUID(), notes: [] };
    setTimelines([...timelines, newTimeline]);
    setActiveTimelineId(newTimeline.id);
  };

  // Update Tone.Transport BPM
  useEffect(() => {
    Tone.getTransport().bpm.value = tempo;
  }, [tempo]);

  return (
    <section
      className={twMerge(
        ...[
          "flex flex-col items-center bg-gray-800 rounded-lg p-4 gap-4",
          "sm:flex-row",
        ],
      )}
    >
      <div className="flex items-center gap-4 w-full">
        <button
          onClick={handlePlayStop}
          className={`w-24 h-16 text-lg font-bold rounded-lg flex items-center justify-center transition-colors ${isPlaying ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"}`}
        >
          {isPlaying ? "Stop" : "Play"}
        </button>

        <button
          onClick={() => setIsLooping(!isLooping)}
          className={`w-24 h-16 text-lg font-bold rounded-lg flex items-center justify-center transition-colors ${isLooping ? "bg-purple-600 ring-2 ring-white" : "bg-gray-600"}`}
        >
          Loop
        </button>

        <div className="bg-gray-700 rounded-lg p-3">
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

      <button
        onClick={handleAddTimeline}
        className={twMerge(
          ...[
            "bg-indigo-600 hover:bg-indigo-500 font-semibold py-3 rounded-lg transition-colors p-3 shrink-0 w-full",
            "sm:w-fit",
          ],
        )}
      >
        New Timeline
      </button>
    </section>
  );
};

export default ConfigWrapper;
