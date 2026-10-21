"use client";

import { useEffect, useState } from "react";
import Dialog from "@/components/site/Dialog";
import { deleteSavedGearSet, getSavedGearSets, saveGearSet, type SavedGearSet } from "@/lib/saved-gear-sets";

// Share (copy the address bar's link), Save and My Sets, copied from the raid
// comp planner's controls. `code` is the current share code (null = empty set).
export default function GearActions({
  classId,
  code,
  race,
  onLoad,
}: {
  classId: string;
  code: string | null;
  race: string;
  onLoad: (set: SavedGearSet) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [name, setName] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState<SavedGearSet[]>([]);
  useEffect(() => {
    // localStorage isn't available during prerender: start empty, sync once mounted (as raid comp does).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(getSavedGearSets(classId));
  }, [classId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; the address bar already holds the link
    }
  };

  const confirmSave = () => {
    const trimmed = name.trim();
    if (!trimmed || !code) return;
    if (!saveGearSet({ classId, name: trimmed, code, race })) return setSaveError(true);
    setSaved(getSavedGearSets(classId));
    setSaveOpen(false);
  };

  const button = "rounded border border-border px-2 py-1 text-sm hover:border-accent/60 hover:text-foreground disabled:opacity-40";
  return (
    <>
      <button type="button" onClick={copyLink} disabled={!code} className="rounded border border-accent/60 px-2 py-1 text-sm text-foreground hover:bg-surface-hover disabled:opacity-40">
        {copied ? "Link copied" : "Share"}
      </button>
      <button
        type="button"
        onClick={() => {
          setName("");
          setSaveError(false);
          setSaveOpen(true);
        }}
        disabled={!code}
        title={!code ? "Equip at least one item to save a set" : undefined}
        className={button}
      >
        Save
      </button>
      <button type="button" onClick={() => setListOpen(true)} className={button}>
        My Sets{saved.length > 0 ? ` (${saved.length})` : ""}
      </button>

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} title="Save gear set">
        <p className="text-xs text-foreground-muted">Saved to this browser only -- not synced across devices, and cleared if you clear site data.</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && confirmSave()}
          placeholder="e.g. Arms leveling, SM run"
          autoFocus
          className="mt-3 w-full rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground focus:border-accent focus:outline-none"
        />
        {saveError && <p className="mt-2 text-xs text-red-400">Couldn&apos;t save -- your browser&apos;s storage may be full or unavailable.</p>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={() => setSaveOpen(false)} className="rounded border border-border px-3 py-1 text-xs text-foreground-muted hover:text-foreground">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmSave}
            disabled={!name.trim()}
            className="rounded border border-accent/60 px-3 py-1 text-xs text-accent hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </Dialog>

      <Dialog open={listOpen} onClose={() => setListOpen(false)} title="My Sets">
        <p className="text-xs text-foreground-muted">Saved to this browser only -- not synced across devices.</p>
        {saved.length === 0 ? (
          <p className="mt-3 text-sm text-foreground-muted">No saved sets yet.</p>
        ) : (
          <ul className="scrollbar-gold mt-3 max-h-80 cursor-default space-y-2 overflow-y-auto">
            {saved.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded border border-border bg-background/40 p-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground">{s.name}</div>
                  <div className="truncate text-xs text-foreground-muted">
                    {s.code.split(".")[1] === "h" ? "Horde" : "Alliance"} · {s.code.split(".").slice(2).filter(Boolean).length} items ·{" "}
                    {new Date(s.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLoad(s);
                    setListOpen(false);
                  }}
                  className="shrink-0 rounded border border-accent/60 px-2 py-1 text-xs text-accent hover:bg-surface-hover"
                >
                  Load
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteSavedGearSet(s.id);
                    setSaved(getSavedGearSets(classId));
                  }}
                  aria-label={`Delete ${s.name}`}
                  className="shrink-0 rounded border border-border px-2 py-1 text-xs text-foreground-muted hover:border-red-400/60 hover:text-red-400"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </>
  );
}
