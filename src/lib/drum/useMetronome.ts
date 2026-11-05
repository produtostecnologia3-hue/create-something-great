import { useCallback, useEffect, useRef, useState } from "react";
import { accentFor, BEATS, type Mixer, type SongSettings } from "./types";

const NUMBERS = ["Um", "Dois", "Três", "Quatro", "Cinco", "Seis"];

function speak(text: string, volume: number) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || volume <= 0) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  u.rate = 1.25;
  u.volume = Math.min(1, volume);
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}

export interface Tick {
  beat: number;
  bar: number; // 1-based, negative/zero during count-in
  countIn: boolean;
}

export function useMetronome(settings: SongSettings, mixer: Mixer) {
  const [playing, setPlaying] = useState(false);
  const [tick, setTick] = useState<Tick | null>(null);
  const settingsRef = useRef(settings);
  const mixerRef = useRef(mixer);
  settingsRef.current = settings;
  mixerRef.current = mixer;

  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const state = useRef({ next: 0, sub: 0, beat: 0, bar: 1, countInLeft: 0 });

  const click = (time: number, kind: "strong" | "medium" | "weak" | "sub" | "stick", gain: number) => {
    const ctx = ctxRef.current!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    const freq = { strong: 1760, medium: 1320, weak: 1000, sub: 750, stick: 2400 }[kind];
    osc.type = kind === "stick" ? "triangle" : "square";
    osc.frequency.setValueAtTime(freq, time);
    const peak = gain * (kind === "sub" ? 0.35 : kind === "weak" ? 0.6 : 1) * 0.5;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, time + (kind === "stick" ? 0.03 : 0.05));
    osc.connect(g).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.07);
  };

  const at = (time: number, fn: () => void) => {
    const ctx = ctxRef.current!;
    window.setTimeout(fn, Math.max(0, (time - ctx.currentTime) * 1000));
  };

  const scheduler = useCallback(() => {
    const ctx = ctxRef.current!;
    const s = state.current;
    while (s.next < ctx.currentTime + 0.12) {
      const cfg = settingsRef.current;
      const mx = mixerRef.current;
      const beats = BEATS[cfg.timeSig];
      const subs = cfg.subdivision;
      const time = s.next;
      const counting = s.countInLeft > 0;

      if (s.sub === 0) {
        const beat = s.beat;
        const bar = s.bar;
        if (counting) {
          if (cfg.countInVoice === "voice") {
            click(time, "stick", mx.master * mx.countIn * 0.4);
            at(time, () => speak(NUMBERS[beat] ?? String(beat + 1), mx.master * mx.countIn));
          } else click(time, "stick", mx.master * mx.countIn);
        } else {
          click(time, accentFor(cfg.timeSig, beat), mx.master * mx.click);
          if (beat === 0) {
            const cue = cfg.cues.find((c) => c.bar === bar);
            if (cue) at(time, () => speak(cue.text, mx.master * mx.cues));
          }
        }
        at(time, () => setTick({ beat, bar: counting ? -s.countInLeft : bar, countIn: counting }));
      } else if (!counting) {
        click(time, "sub", mx.master * mx.click);
      }

      // advance
      const beatLen = (60 / cfg.bpm) * (cfg.timeSig === "6/8" ? 0.5 : 1);
      s.next += beatLen / (counting ? 1 : subs);
      s.sub = counting ? 0 : (s.sub + 1) % subs;
      if (s.sub === 0) {
        s.beat += 1;
        if (s.beat >= beats) {
          s.beat = 0;
          if (counting) s.countInLeft -= 1;
          else s.bar += 1;
        }
      }
    }
  }, []);

  const start = useCallback(async () => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    await ctxRef.current.resume();
    state.current = {
      next: ctxRef.current.currentTime + 0.08,
      sub: 0,
      beat: 0,
      bar: 1,
      countInLeft: settingsRef.current.countInBars,
    };
    timerRef.current = window.setInterval(scheduler, 25);
    setPlaying(true);
  }, [scheduler]);

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setPlaying(false);
    setTick(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { playing, tick, start, stop, toggle: () => (playing ? stop() : start()) };
}

export function useWakeLock(active: boolean) {
  const [supported, setSupported] = useState(false);
  const [locked, setLocked] = useState(false);
  useEffect(() => setSupported(typeof navigator !== "undefined" && "wakeLock" in navigator), []);
  useEffect(() => {
    if (!active || !supported) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) return sentinel.release();
        setLocked(true);
        sentinel.addEventListener("release", () => setLocked(false));
      } catch {
        setLocked(false);
      }
    };
    acquire();
    const onVis = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      sentinel?.release();
      setLocked(false);
    };
  }, [active, supported]);
  return { supported, locked };
}

export function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch {}
    loaded.current = true;
  }, [key]);
  useEffect(() => {
    if (loaded.current) localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}
