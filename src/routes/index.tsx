import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { ListMusic, SlidersHorizontal, Play, Square, Sun, SunDim, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import { BpmControls, MetronomeDisplay, ScreenFlash } from "@/components/drum/Metronome";
import { MixerSheet, SetlistSheet, VoicePanel } from "@/components/drum/Panels";
import { DEFAULT_MIXER, DEFAULT_SETTINGS, type Song, type SongSettings } from "@/lib/drum/types";
import { useMetronome, usePersistent, useWakeLock } from "@/lib/drum/useMetronome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stick Click — Metrônomo e guia de palco para bateristas" },
      { name: "description", content: "Metrônomo com contagem por voz, avisos por compasso e setlist ao vivo para bateristas." },
      { property: "og:title", content: "Stick Click — Metrônomo para bateristas" },
      { property: "og:description", content: "Contagem por voz, avisos por compasso e modo show." },
    ],
  }),
  component: Index,
});

function Index() {
  const [settings, setSettings] = usePersistent<SongSettings>("sc.settings", DEFAULT_SETTINGS);
  const [mixer, setMixer] = usePersistent("sc.mixer", DEFAULT_MIXER);
  const [songs, setSongs] = usePersistent<Song[]>("sc.songs", []);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [flash, setFlash] = usePersistent("sc.flash", true);
  const [keepAwake, setKeepAwake] = usePersistent("sc.wake", true);
  const [mixerOpen, setMixerOpen] = useState(false);
  const [setlistOpen, setSetlistOpen] = useState(false);

  const metro = useMetronome(settings, mixer);
  const wake = useWakeLock(metro.playing && keepAwake);
  const update = (p: Partial<SongSettings>) => setSettings((s) => ({ ...s, ...p }));
  const active = songs.find((s) => s.id === activeId);

  const load = (s: Song) => {
    const { id, name, ...rest } = s;
    setSettings(rest);
    setActiveId(id);
  };
  const next = () => {
    const i = songs.findIndex((s) => s.id === activeId);
    const n = songs[i + 1] ?? songs[0];
    if (n) load(n);
  };

  return (
    <div className="mx-auto min-h-screen max-w-xl pb-36">
      <ScreenFlash tick={metro.tick} enabled={flash} />
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <button onClick={() => setSetlistOpen(true)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-xl border border-border bg-card px-3 text-left">
          <ListMusic className="size-5 shrink-0" />
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Setlist</span>
            <span className="block truncate text-sm font-medium">{active?.name ?? "Música livre"}</span>
          </span>
        </button>
        {songs.length > 1 && (
          <button aria-label="Próxima música" onClick={next} className="grid size-12 place-items-center rounded-xl border border-border bg-card">
            <SkipForward className="size-5" />
          </button>
        )}
        <button aria-label="Mixer" onClick={() => setMixerOpen(true)} className="grid size-12 place-items-center rounded-xl border border-border bg-card">
          <SlidersHorizontal className="size-5" />
        </button>
      </header>

      <main className="space-y-4 p-4">
        <MetronomeDisplay settings={settings} tick={metro.tick} playing={metro.playing} flash={flash} onFlash={setFlash} />
        <BpmControls settings={settings} update={update} />
        <VoicePanel settings={settings} update={update} />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-3">
          <button
            onClick={() => setKeepAwake(!keepAwake)}
            className={cn("flex size-14 flex-col items-center justify-center rounded-xl text-[10px]", keepAwake ? "text-foreground" : "text-muted-foreground")}
          >
            {keepAwake ? <Sun className="size-5" /> : <SunDim className="size-5" />}
            {keepAwake ? (wake.locked ? "Tela on" : "Acesa") : "Auto"}
          </button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={metro.toggle}
            aria-label={metro.playing ? "Parar" : "Tocar"}
            className={cn(
              "-mt-10 grid size-24 place-items-center rounded-full border-4 border-background transition-colors",
              metro.playing ? "bg-live text-live-foreground shadow-live" : "bg-primary text-primary-foreground",
            )}
          >
            {metro.playing ? <Square className="size-8 fill-current" /> : <Play className="ml-1 size-9 fill-current" />}
          </motion.button>
          <div className="flex size-14 flex-col items-center justify-center font-mono text-[10px] text-muted-foreground">
            <span className="text-base text-foreground">{settings.bpm}</span>
            BPM
          </div>
        </div>
      </nav>

      <MixerSheet open={mixerOpen} onOpenChange={setMixerOpen} mixer={mixer} setMixer={setMixer} />
      <SetlistSheet open={setlistOpen} onOpenChange={setSetlistOpen} songs={songs} setSongs={setSongs} current={settings} activeId={activeId} onLoad={load} />
    </div>
  );
}
