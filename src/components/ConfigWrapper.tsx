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
import * as Tone from "tone";
import { Time } from "tone/build/esm/core/type/Units";

interface ConfigWrapperProps {
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  timelines: Timeline[];
  synthRefA: RefObject<Tone.PolySynth<Tone.Synth<Tone.SynthOptions>> | null>;
  synthRefB: RefObject<Tone.PolySynth<Tone.Synth<Tone.SynthOptions>> | null>;
  setTimelines: Dispatch<SetStateAction<Timeline[]>>;
  setActiveTimelineId: Dispatch<SetStateAction<string | null>>;
}

const ConfigWrapper = ({
  isPlaying,
  setIsPlaying,
  setCurrentStep,
  timelines,
  synthRefA,
  synthRefB,
  setTimelines,
  setActiveTimelineId,
}: ConfigWrapperProps) => {
  const partPlayersRef = useRef<(Tone.Part | Tone.Loop)[]>([]);
  const [tempo, setTempo] = useState<number>(120);
  const [isLooping, setIsLooping] = useState<boolean>(false);

  const handlePlayStop = useCallback(async () => {
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
      const events = timeline.notes
        .filter((note): note is TimelineNote => note.type !== "rest")
        .map((note) => [note.time, note.pitch] as [string, string]);
      return new Tone.Part((time, pitch) => {
        synthRefA.current?.triggerAttackRelease(pitch, "8n", time);
        synthRefB.current?.triggerAttackRelease(pitch, "8n", time);
      }, events).start(0);
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
    setCurrentStep,
    setIsPlaying,
    synthRefA,
    synthRefB,
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
    <section className="flex flex-row items-center bg-gray-800 rounded-lg p-4 gap-4">
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

      <div className="flex flex-row items-center">
        <button
          onClick={handleAddTimeline}
          className="bg-indigo-600 hover:bg-indigo-500 font-semibold py-3 rounded-lg transition-colors p-3 shrink-0"
        >
          New Timeline
        </button>
      </div>
    </section>
  );
};

export default ConfigWrapper;
