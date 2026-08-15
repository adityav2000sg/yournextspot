import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import type { LockerDetail, LockerSummary } from "../types";
import { useAuth } from "../lib/auth";
import SpotCard from "../components/SpotCard";
import VisitEntryPanel from "../components/VisitEntryPanel";

interface Props {
  onSignIn: () => void;
}

export default function Locker({ onSignIn }: Props) {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [lockers, setLockers] = useState<LockerSummary[]>([]);
  const [detail, setDetail] = useState<LockerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingLocker, setEditingLocker] = useState<LockerSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      api.lockers(),
      id ? api.locker(id) : Promise.resolve<{ locker: LockerDetail | null }>({ locker: null }),
    ])
      .then(([lockerRes, detailRes]) => {
        if (cancelled) return;
        setLockers(lockerRes.lockers);
        setDetail(detailRes.locker);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load Locker.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, id]);

  const activeLocker = useMemo(
    () => (id ? lockers.find((locker) => locker.id === id) ?? detail : null),
    [id, lockers, detail]
  );

  function beginEdit(locker: LockerSummary) {
    setEditingLocker(locker);
    setName(locker.name);
    setDescription(locker.description ?? "");
  }

  async function submitLocker(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body = { name: name.trim(), description: description.trim() || null };
      const res = editingLocker
        ? await api.updateLocker(editingLocker.id, body)
        : await api.createLocker(body);
      setLockers((current) =>
        editingLocker
          ? current.map((locker) => (locker.id === res.locker.id ? res.locker : locker))
          : [...current, res.locker]
      );
      setEditingLocker(null);
      setName("");
      setDescription("");
      if (!editingLocker) navigate(`/locker/${res.locker.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save Locker.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteLocker(lockerId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteLocker(lockerId);
      setLockers((current) => current.filter((locker) => locker.id !== lockerId));
      setConfirmDeleteId(null);
      if (id === lockerId) navigate("/locker");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete Locker.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSpot(slug: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.removeFromLocker(id, slug);
      setDetail((current) =>
        current ? { ...current, items: current.items.filter((item) => item.spot.slug !== slug), itemCount: current.itemCount - 1 } : current
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove spot.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-5">
        <div className="h-72 animate-pulse rounded-[2rem] bg-white/[0.045]" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-5">
        <section className="glass rounded-[1.75rem] p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-aqua">Locker</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-mist-100 sm:text-5xl">
            Your saved places live here.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-mist-400">
            Browse and Decide as a guest. Sign in only when you want to save, mark visited, or keep private notes.
          </p>
          <button onClick={onSignIn} className="soft-button btn mt-5 bg-mist-100 text-ink-900 hover:bg-white">
            Open Locker
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-3 pb-20 pt-5 sm:px-5 sm:pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.26em] text-aqua">Your Locker</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.035em] text-mist-100 sm:text-5xl">
            {activeLocker?.name ?? "Saved places"}
          </h1>
          {activeLocker?.description && <p className="mt-2 text-sm text-mist-400">{activeLocker.description}</p>}
        </div>
        <Link to="/" className="btn-ghost border border-white/10">
          Back to Atlas
        </Link>
      </div>

      {error && <p className="mb-4 rounded-2xl border border-ember/25 bg-ember/10 px-4 py-3 text-sm text-ember">{error}</p>}

      <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="grid gap-4 self-start">
          <div className="glass rounded-[1.5rem] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-mist-400">Lockers</p>
              <span className="font-mono text-sm text-mist-300">{lockers.length}</span>
            </div>
            <div className="mt-3 grid gap-2">
              {lockers.length === 0 ? (
                <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-mist-400">
                  Create your first Locker below.
                </p>
              ) : (
                lockers.map((locker) => (
                  <Link
                    key={locker.id}
                    to={`/locker/${locker.id}`}
                    className={`rounded-2xl border p-3 transition ${
                      id === locker.id
                        ? "border-aqua/35 bg-aqua/10"
                        : "border-white/10 bg-white/[0.04] hover:bg-white/[0.065]"
                    }`}
                  >
                    <span className="block text-sm font-semibold text-mist-100">{locker.name}</span>
                    <span className="mt-1 block text-xs text-mist-400">
                      {locker.itemCount} saved · {locker.visitedCount} visited
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>

          <form onSubmit={submitLocker} className="glass rounded-[1.5rem] p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-aqua">
              {editingLocker ? "Edit Locker" : "Create Locker"}
            </p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={48}
              required
              placeholder="Locker name"
              className="input mt-3 min-h-[42px] py-2 text-sm"
            />
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={180}
              placeholder="Description"
              className="input mt-2 min-h-[42px] py-2 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button disabled={busy} className="btn bg-mist-100 text-ink-900 hover:bg-white" type="submit">
                {busy ? "Saving..." : editingLocker ? "Save" : "Create"}
              </button>
              {editingLocker && (
                <button type="button" className="btn-ghost border border-white/10" onClick={() => {
                  setEditingLocker(null);
                  setName("");
                  setDescription("");
                }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </aside>

        <section className="min-w-0">
          {!id ? (
            <div className="glass rounded-[1.75rem] p-6">
              <p className="text-[10px] uppercase tracking-[0.24em] text-mist-400">Start here</p>
              <h2 className="mt-2 text-2xl font-semibold text-mist-100">Open a Locker to manage saved places.</h2>
              <p className="mt-2 text-sm leading-6 text-mist-400">
                Default lockers are created once for each account. New saves go to Want to Try unless you choose otherwise.
              </p>
            </div>
          ) : detail ? (
            <div className="grid gap-4">
              <div className="glass rounded-[1.5rem] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button className="btn-ghost border border-white/10" onClick={() => beginEdit(detail)}>
                      Rename
                    </button>
                    {confirmDeleteId === detail.id ? (
                      <>
                        <button className="btn border border-ember/30 bg-ember/10 text-ember" disabled={busy} onClick={() => void deleteLocker(detail.id)}>
                          Confirm delete
                        </button>
                        <button className="btn-ghost border border-white/10" onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className="btn-ghost border border-ember/20 text-ember" onClick={() => setConfirmDeleteId(detail.id)}>
                        Delete
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-mist-400">
                    {detail.itemCount} saved · {detail.visitedCount} visited
                  </p>
                </div>
              </div>

              {detail.items.length === 0 ? (
                <div className="glass rounded-[1.75rem] p-8 text-center">
                  <p className="text-2xl font-semibold text-mist-100">Nothing saved here yet.</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-mist-400">
                    Save from a place card, a pull result, or a place detail page.
                  </p>
                </div>
              ) : (
                detail.items.map((item) => (
                  <article key={item.id} className="glass rounded-[1.5rem] p-4">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                      <div className="min-w-0">
                        <SpotCard spot={item.spot} onSignIn={onSignIn} />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            disabled={busy}
                            onClick={() => void removeSpot(item.spot.slug)}
                            className="btn-ghost border border-ember/20 text-ember"
                          >
                            Remove from Locker
                          </button>
                          <Link to={`/spot/${item.spot.slug}`} className="btn-ghost border border-white/10">
                            Open place
                          </Link>
                        </div>
                      </div>
                      <VisitEntryPanel slug={item.spot.slug} initialVisits={item.visits} compact />
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : (
            <div className="glass rounded-[1.75rem] p-8 text-center">
              <p className="text-2xl font-semibold text-mist-100">Locker not found.</p>
              <Link to="/locker" className="btn-ghost mt-4 border border-white/10">
                Back to Locker
              </Link>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
