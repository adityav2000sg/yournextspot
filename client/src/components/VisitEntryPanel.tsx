import { useEffect, useState } from "react";
import { api, type VisitBody } from "../api";
import type { VisitEntry } from "../types";

interface Props {
  slug: string;
  initialVisits?: VisitEntry[];
  compact?: boolean;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toDateInput(value: string) {
  return value.slice(0, 10);
}

export default function VisitEntryPanel({ slug, initialVisits, compact = false }: Props) {
  const [visits, setVisits] = useState<VisitEntry[]>(initialVisits ?? []);
  const [loading, setLoading] = useState(!initialVisits);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<VisitBody>({
    visitDate: today(),
    rating: 8,
    note: "",
    favoriteItem: "",
    companion: "",
    wouldReturn: true,
  });

  useEffect(() => {
    if (initialVisits) {
      setVisits(initialVisits);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .visits(slug)
      .then(({ visits }) => {
        if (!cancelled) setVisits(visits);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load visits.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, initialVisits]);

  function reset() {
    setEditingId(null);
    setForm({
      visitDate: today(),
      rating: 8,
      note: "",
      favoriteItem: "",
      companion: "",
      wouldReturn: true,
    });
  }

  function edit(visit: VisitEntry) {
    setEditingId(visit.id);
    setForm({
      visitDate: toDateInput(visit.visitDate),
      rating: visit.rating,
      note: visit.note ?? "",
      favoriteItem: visit.favoriteItem ?? "",
      companion: visit.companion ?? "",
      wouldReturn: visit.wouldReturn,
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...form,
        note: form.note?.trim() || null,
        favoriteItem: form.favoriteItem?.trim() || null,
        companion: form.companion?.trim() || null,
      };
      const { visit } = editingId
        ? await api.updateVisit(editingId, payload)
        : await api.addVisit(slug, payload);
      setVisits((current) =>
        editingId
          ? current.map((item) => (item.id === visit.id ? visit : item))
          : [visit, ...current]
      );
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save visit.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setSaving(true);
    setError(null);
    try {
      await api.deleteVisit(id);
      setVisits((current) => current.filter((visit) => visit.id !== id));
      setPendingDeleteId(null);
      if (editingId === id) reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete visit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={`rounded-2xl glass ${compact ? "p-4" : "p-5 sm:p-6"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-aqua">Private visits</p>
          <h3 className="mt-1 text-xl font-semibold text-mist-100">
            {editingId ? "Edit visit" : "Record a visit"}
          </h3>
        </div>
        <span className="decision-chip border-white/10 bg-white/[0.055] text-mist-300">
          Only you
        </span>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-mist-300">
            Visit date
            <input
              type="date"
              required
              value={form.visitDate}
              onChange={(e) => setForm((current) => ({ ...current, visitDate: e.target.value }))}
              className="input mt-2 min-h-[42px] py-2 text-sm"
            />
          </label>
          <label className="text-xs font-semibold text-mist-300">
            Rating
            <input
              type="number"
              min={1}
              max={10}
              step={0.1}
              required
              value={form.rating}
              onChange={(e) => setForm((current) => ({ ...current, rating: Number(e.target.value) }))}
              className="input mt-2 min-h-[42px] py-2 text-sm"
            />
          </label>
        </div>
        <label className="text-xs font-semibold text-mist-300">
          Favourite dish or drink
          <input
            value={form.favoriteItem ?? ""}
            onChange={(e) => setForm((current) => ({ ...current, favoriteItem: e.target.value }))}
            maxLength={120}
            placeholder="Optional"
            className="input mt-2 min-h-[42px] py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-mist-300">
          Companion
          <input
            value={form.companion ?? ""}
            onChange={(e) => setForm((current) => ({ ...current, companion: e.target.value }))}
            maxLength={120}
            placeholder="Optional"
            className="input mt-2 min-h-[42px] py-2 text-sm"
          />
        </label>
        <label className="text-xs font-semibold text-mist-300">
          Private note
          <textarea
            value={form.note ?? ""}
            onChange={(e) => setForm((current) => ({ ...current, note: e.target.value }))}
            maxLength={500}
            rows={3}
            placeholder="What should future-you remember?"
            className="input mt-2 resize-none text-sm"
          />
        </label>
        <label className="flex items-center gap-3 text-sm text-mist-300">
          <input
            type="checkbox"
            checked={form.wouldReturn}
            onChange={(e) => setForm((current) => ({ ...current, wouldReturn: e.target.checked }))}
            className="h-4 w-4 accent-aqua"
          />
          I would return
        </label>

        {error && <p className="rounded-xl border border-ember/25 bg-ember/10 px-3 py-2 text-sm text-ember">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="btn bg-mist-100 text-ink-900 hover:bg-white"
          >
            {saving ? "Saving..." : editingId ? "Save changes" : "Mark visited"}
          </button>
          {editingId && (
            <button type="button" onClick={reset} className="btn-ghost border border-white/10">
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div className="mt-5 border-t border-white/10 pt-4">
        {loading ? (
          <div className="h-16 animate-pulse rounded-2xl bg-white/[0.05]" />
        ) : visits.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-mist-400">
            No private visits yet.
          </p>
        ) : (
          <div className="grid gap-2">
            {visits.map((visit) => (
              <article key={visit.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm text-gilt">{visit.rating.toFixed(1)} / 10</p>
                    <p className="mt-1 text-xs text-mist-400">
                      {new Date(visit.visitDate).toLocaleDateString("en-SG", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {visit.companion ? ` · ${visit.companion}` : ""}
                    </p>
                  </div>
                  <span className={`decision-chip ${visit.wouldReturn ? "border-aqua/25 bg-aqua/10 text-aqua" : "border-ember/25 bg-ember/10 text-ember"}`}>
                    {visit.wouldReturn ? "return" : "skip next"}
                  </span>
                </div>
                {visit.favoriteItem && <p className="mt-2 text-sm text-mist-200">Best: {visit.favoriteItem}</p>}
                {visit.note && <p className="mt-2 text-sm leading-6 text-mist-300">{visit.note}</p>}
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => edit(visit)} className="btn-ghost min-h-[34px] border border-white/10 px-3 py-1 text-xs">
                    Edit
                  </button>
                  {pendingDeleteId === visit.id ? (
                    <>
                      <button type="button" onClick={() => void remove(visit.id)} className="btn min-h-[34px] border border-ember/30 bg-ember/10 px-3 py-1 text-xs text-ember">
                        Confirm delete
                      </button>
                      <button type="button" onClick={() => setPendingDeleteId(null)} className="btn-ghost min-h-[34px] border border-white/10 px-3 py-1 text-xs">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setPendingDeleteId(visit.id)} className="btn-ghost min-h-[34px] border border-ember/20 px-3 py-1 text-xs text-ember">
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
