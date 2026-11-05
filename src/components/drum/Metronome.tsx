import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { BEATS, SUBDIVISIONS, clampBpm, type SongSettings, type TimeSig } from "@/lib/drum/types";
import type { Tick } from "@/lib/drum/useMetronome";

export function Panel({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      {title && <h2 className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">{title}</h2>}
      {children}
    </section>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid gap-1 rounded-xl bg-background p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative min-h-12 rounded-lg text-sm font-medium transition-colors",
            value === o.value ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {value === o.value && (
            <motion.span layoutId={`seg-${options.map((x) => x.value).join()}`} className="absolute inset-0 rounded-lg bg-primary" transition={{ type: "spring", bounce: 0.2, duration: 0.35 }} />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function MetronomeDisplay({
  settings,
  tick,
  playing,
  flash,
  onFlash,
}: {
  settings: SongSettings;
  tick: Tick | null;
  playing: boolean;
  flash: boolean;
  onFlash: (v: boolean) => void;
}) {
  const beats = BEATS[settings.timeSig];
  return (
    <Panel className="relative overflow-hidden text-center">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <span className="font-mono">
          {tick ? (tick.countIn ? `contagem ${-tick.bar}` : `compasso ${tick.bar}`) : "pronto"}
        </span>
        <label className="flex items-center gap-2">
          Flash
          <Switch checked={flash} onCheckedChange={onFlash} />
        </label>
      </div>
      <div className="my-4 font-mono text-[7rem] font-bold leading-none tracking-tighter tabular-nums">{settings.bpm}</div>
      <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">BPM · {settings.timeSig}</div>
      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: beats }).map((_, i) => {
          const on = playing && tick?.beat === i;
          const first = i === 0;
          return (
            <motion.div
              key={i}
              animate={{ scale: on ? 1.15 : 1 }}
              transition={{ duration: 0.08 }}
              className={cn(
                "h-12 flex-1 max-w-16 rounded-xl border border-border transition-colors duration-75",
                on && first && "border-live bg-live shadow-live",
                on && !first && (tick?.countIn ? "bg-muted-foreground" : "bg-primary"),
                !on && first && "bg-accent",
                !on && !first && "bg-secondary",
              )}
            />
          );
        })}
      </div>
    </Panel>
  );
}

export function ScreenFlash({ tick, enabled }: { tick: Tick | null; enabled: boolean }) {
  const show = enabled && tick && tick.beat === 0 && !tick.countIn;
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={`${tick!.bar}`}
          initial={{ opacity: 0.45 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="pointer-events-none fixed inset-0 z-40 bg-live"
        />
      )}
    </AnimatePresence>
  );
}

export function BpmControls({ settings, update }: { settings: SongSettings; update: (p: Partial<SongSettings>) => void }) {
  const taps = useRef<number[]>([]);
  const tap = () => {
    const now = performance.now();
    taps.current = [...taps.current.filter((t) => now - t < 2500), now].slice(-6);
    if (taps.current.length >= 2) {
      const d = taps.current.slice(1).map((t, i) => t - taps.current[i]);
      update({ bpm: clampBpm(60000 / (d.reduce((a, b) => a + b, 0) / d.length)) });
    }
  };
  const step = (n: number) => update({ bpm: clampBpm(settings.bpm + n) });
  return (
    <Panel title="Andamento">
      <Slider value={[settings.bpm]} min={30} max={300} step={1} onValueChange={([v]) => update({ bpm: v })} className="py-4" />
      <div className="mt-3 grid grid-cols-4 gap-2">
        {[-5, -1, 1, 5].map((n) => (
          <motion.button
            whileTap={{ scale: 0.92 }}
            key={n}
            onClick={() => step(n)}
            className="min-h-14 rounded-xl border border-border bg-secondary font-mono text-lg font-semibold"
          >
            {n > 0 ? `+${n}` : n}
          </motion.button>
        ))}
      </div>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={tap}
        className="mt-2 min-h-16 w-full rounded-xl border border-border bg-accent text-sm font-semibold uppercase tracking-[0.3em]"
      >
        Tap Tempo
      </motion.button>
      <div className="mt-4 space-y-3">
        <Segmented<TimeSig>
          value={settings.timeSig}
          onChange={(timeSig) => update({ timeSig })}
          options={(["4/4", "3/4", "6/8"] as TimeSig[]).map((v) => ({ value: v, label: <span className="font-mono">{v}</span> }))}
        />
        <Segmented
          value={settings.subdivision}
          onChange={(subdivision) => update({ subdivision })}
          options={SUBDIVISIONS.map((s) => ({
            value: s.value,
            label: (
              <span className="flex flex-col leading-tight">
                <span className="text-base">{s.symbol}</span>
                <span className="text-[10px]">{s.label}</span>
              </span>
            ),
          }))}
        />
      </div>
    </Panel>
  );
}
