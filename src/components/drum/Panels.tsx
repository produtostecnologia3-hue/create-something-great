import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Plus, Trash2, Mic, Radio, Save, Play } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Panel, Segmented } from "./Metronome";
import { uid, type Mixer, type Song, type SongSettings } from "@/lib/drum/types";

const field = "min-h-12 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-ring";

export function VoicePanel({ settings, update }: { settings: SongSettings; update: (p: Partial<SongSettings>) => void }) {
  const [bar, setBar] = useState("32");
  const [text, setText] = useState("");
  const add = () => {
    const n = parseInt(bar, 10);
    if (!n || !text.trim()) return;
    update({ cues: [...settings.cues, { id: uid(), bar: n, text: text.trim() }].sort((a, b) => a.bar - b.bar) });
    setText("");
  };
  return (
    <Panel title="Contagem & Comandos de Voz">
      <p className="mb-2 text-xs text-muted-foreground">Pré-contagem</p>
      <Segmented
        value={settings.countInBars}
        onChange={(countInBars) => update({ countInBars })}
        options={[
          { value: 0, label: "Off" },
          { value: 1, label: "1 comp." },
          { value: 2, label: "2 comp." },
        ]}
      />
      <p className="mb-2 mt-4 text-xs text-muted-foreground">Som da contagem</p>
      <Segmented
        value={settings.countInVoice}
        onChange={(countInVoice) => update({ countInVoice })}
        options={[
          { value: "voice", label: <span className="flex items-center justify-center gap-2"><Mic className="size-4" />Voz IA</span> },
          { value: "stick", label: <span className="flex items-center justify-center gap-2"><Radio className="size-4" />Cross-stick</span> },
        ]}
      />
      <p className="mb-2 mt-5 text-xs text-muted-foreground">Timeline da música</p>
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {settings.cues.map((c) => (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-secondary p-2 pl-3"
            >
              <span className="w-12 font-mono text-xs text-muted-foreground">C.{c.bar}</span>
              <span className="flex-1 text-sm">{c.text}</span>
              <button
                aria-label="Remover comando"
                onClick={() => update({ cues: settings.cues.filter((x) => x.id !== c.id) })}
                className="grid size-12 place-items-center rounded-lg text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <div className="mt-3 flex gap-2">
        <input aria-label="Compasso" inputMode="numeric" value={bar} onChange={(e) => setBar(e.target.value.replace(/\D/g, ""))} className={cn(field, "w-16 text-center font-mono")} />
        <input aria-label="Aviso" placeholder="Ex: Refrão" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className={cn(field, "min-w-0 flex-1")} />
        <button aria-label="Adicionar comando" onClick={add} className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Plus className="size-5" />
        </button>
      </div>
    </Panel>
  );
}

export function MixerSheet({ open, onOpenChange, mixer, setMixer }: { open: boolean; onOpenChange: (v: boolean) => void; mixer: Mixer; setMixer: (m: Mixer) => void }) {
  const rows: { key: keyof Mixer; label: string }[] = [
    { key: "master", label: "Master" },
    { key: "click", label: "Clique do metrônomo" },
    { key: "countIn", label: "Contagem" },
    { key: "cues", label: "Avisos de voz" },
  ];
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl border-border bg-card pb-10">
        <SheetHeader>
          <SheetTitle>Mixer</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 px-4">
          {rows.map((r) => (
            <div key={r.key}>
              <div className="mb-3 flex justify-between text-sm">
                <span>{r.label}</span>
                <span className="font-mono text-muted-foreground">{Math.round(mixer[r.key] * 100)}</span>
              </div>
              <Slider value={[mixer[r.key] * 100]} max={100} step={1} onValueChange={([v]) => setMixer({ ...mixer, [r.key]: (v ?? 0) / 100 })} />
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function SetlistSheet({
  open,
  onOpenChange,
  songs,
  setSongs,
  current,
  activeId,
  onLoad,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  songs: Song[];
  setSongs: (s: Song[]) => void;
  current: SongSettings;
  activeId: string | null;
  onLoad: (s: Song) => void;
}) {
  const [name, setName] = useState("");
  const save = () => {
    if (!name.trim()) return;
    const song: Song = { ...current, cues: current.cues.map((c) => ({ ...c })), id: uid(), name: name.trim() };
    setSongs([...songs, song]);
    setName("");
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full max-w-md border-border bg-card">
        <SheetHeader>
          <SheetTitle>Setlist · Modo Show</SheetTitle>
        </SheetHeader>
        <div className="flex h-full flex-col gap-4 overflow-hidden px-4 pb-6">
          <div className="flex gap-2">
            <input placeholder="Nome da música atual" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} className={cn(field, "min-w-0 flex-1")} />
            <button onClick={save} className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <Save className="size-4" /> Salvar
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Toque numa música para trocar BPM e vozes na hora — sem parar o clique.</p>
          <ol className="flex-1 space-y-2 overflow-y-auto">
            {songs.length === 0 && <li className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma música salva ainda.</li>}
            {songs.map((s, i) => {
              const active = s.id === activeId;
              return (
                <motion.li layout key={s.id} className={cn("flex items-center gap-2 rounded-xl border p-1", active ? "border-live bg-accent" : "border-border bg-secondary")}>
                  <button onClick={() => onLoad(s)} className="flex min-h-14 flex-1 items-center gap-3 px-3 text-left">
                    <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1">
                      <span className="block font-medium">{s.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">{s.bpm} BPM · {s.timeSig} · {s.cues.length} avisos</span>
                    </span>
                    {active && <Play className="size-4 text-live" />}
                  </button>
                  <button aria-label="Excluir" onClick={() => setSongs(songs.filter((x) => x.id !== s.id))} className="grid size-12 place-items-center text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}
