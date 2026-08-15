import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api";
import type { LockerSummary } from "../types";

interface Props {
  slug: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SaveToLockerModal({ slug, onClose, onSaved }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [lockers, setLockers] = useState<LockerSummary[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .lockers()
      .then(({ lockers }) => {
        if (cancelled) return;
        setLockers(lockers);
        const first = lockers[0]?.id;
        setSelected(first ? new Set([first]) : new Set());
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load lockers.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    closeRef.current?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [onClose]);

  const hasTarget = selected.size > 0 || newName.trim().length > 0;
  const sortedLockers = useMemo(
    () => [...lockers].sort((a, b) => a.name.localeCompare(b.name)),
    [lockers]
  );

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!hasTarget) return;
    setSaving(true);
    setError(null);
    try {
      await api.saveToLockers(slug, {
        lockerIds: [...selected],
        newLockerName: newName.trim() || undefined,
        newLockerDescription: newDescription.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this spot.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-ink-900/70 p-3 backdrop-blur-md sm:place-items-center" onClick={onClose}>
      <section
        className="glass w-full max-w-md rounded-[1.35rem] p-4 shadow-2xl sm:rounded-[1.75rem] sm:p-5"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Save to Locker"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-aqua">Save to Locker</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-mist-100">
              Choose where this belongs.
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.06] text-mist-300 hover:text-white"
            aria-label="Close save dialog"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-2xl bg-white/[0.05]" />
            ))}
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            {sortedLockers.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-mist-400">
                No lockers yet. Create one below and this spot will be saved there.
              </p>
            ) : (
              sortedLockers.map((locker) => (
                <label
                  key={locker.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${
                    selected.has(locker.id)
                      ? "border-aqua/35 bg-aqua/10"
                      : "border-white/10 bg-white/[0.04] hover:bg-white/[0.065]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(locker.id)}
                    onChange={() => toggle(locker.id)}
                    className="h-4 w-4 accent-aqua"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-mist-100">{locker.name}</span>
                    <span className="mt-0.5 block text-xs text-mist-400">
                      {locker.itemCount} saved · {locker.visitedCount} visited
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <label className="block text-xs font-semibold text-mist-300">
            New locker
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={48}
              placeholder="e.g. Team dinners"
              className="input mt-2 min-h-[42px] py-2 text-sm"
            />
          </label>
          <label className="mt-2 block text-xs font-semibold text-mist-300">
            Description
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              maxLength={180}
              placeholder="Optional"
              className="input mt-2 min-h-[42px] py-2 text-sm"
            />
          </label>
        </div>

        {error && <p className="mt-3 rounded-2xl border border-ember/25 bg-ember/10 px-3 py-2 text-sm text-ember">{error}</p>}

        <button
          type="button"
          onClick={save}
          disabled={saving || loading || !hasTarget}
          className="soft-button btn mt-4 w-full bg-mist-100 text-ink-900 hover:bg-white"
        >
          {saving ? "Saving..." : "Save spot"}
        </button>
      </section>
    </div>
  );
}
