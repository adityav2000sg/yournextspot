import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../lib/auth";

interface Props {
  onSignIn: () => void;
}

export default function Profile({ onSignIn }: Props) {
  const { user, setUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { user } = await api.updateMe({ displayName: displayName.trim() || null });
      setUser(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAccount() {
    setSaving(true);
    setError(null);
    try {
      await api.deleteAccount();
      setUser(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete account.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-5">
        <section className="glass rounded-[1.75rem] p-6 sm:p-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-aqua">Profile</p>
          <h1 className="mt-2 text-3xl font-semibold text-mist-100">Sign in to manage your account.</h1>
          <button onClick={onSignIn} className="soft-button btn mt-5 bg-mist-100 text-ink-900 hover:bg-white">
            Sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-aqua">Account</p>
          <h1 className="mt-1 text-3xl font-semibold text-mist-100 sm:text-5xl">Profile</h1>
        </div>
        <Link to="/locker" className="btn-ghost border border-white/10">
          Open Locker
        </Link>
      </div>

      {error && <p className="mb-4 rounded-2xl border border-ember/25 bg-ember/10 px-4 py-3 text-sm text-ember">{error}</p>}

      <section className="grid gap-4">
        <form onSubmit={save} className="glass rounded-[1.75rem] p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-mist-400">Your details</p>
          <label className="mt-4 block text-sm font-semibold text-mist-300">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className="input mt-2"
            />
          </label>
          <p className="mt-3 text-sm text-mist-400">{user.email}</p>
          <button disabled={saving} className="btn mt-4 bg-mist-100 text-ink-900 hover:bg-white">
            {saving ? "Saving..." : "Save profile"}
          </button>
        </form>

        <section className="glass rounded-[1.75rem] p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-mist-400">Session</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => void logout()} className="btn-ghost border border-white/10">
              Sign out
            </button>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-ember/20 bg-ember/10 p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-ember">Danger zone</p>
          <h2 className="mt-2 text-xl font-semibold text-mist-100">Delete account</h2>
          <p className="mt-2 text-sm leading-6 text-mist-300">
            This removes your account, lockers, saved-place links, private visits and personal reviews from this service.
          </p>
          {confirmDelete ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={saving} onClick={() => void deleteAccount()} className="btn border border-ember/30 bg-ember/15 text-ember">
                Confirm delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="btn-ghost border border-white/10">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn-ghost mt-4 border border-ember/25 text-ember">
              Delete account
            </button>
          )}
        </section>
      </section>
    </main>
  );
}
