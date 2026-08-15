import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useAuth } from "../lib/auth";

interface Props {
  onClose: () => void;
}

export default function AuthModal({ onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { setUser } = useAuth();
  const [step, setStep] = useState<"intro" | "email" | "code" | "success">(
    "intro"
  );
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [delivered, setDelivered] = useState<boolean | null>(null);

  const benefits = [
    {
      k: "01",
      title: "Save your shortlist",
      copy: "Keep the places you want to try without losing them in chats.",
    },
    {
      k: "02",
      title: "Write real verdicts",
      copy: "Add your score, tier, and one-line review after you go.",
    },
    {
      k: "03",
      title: "Train your atlas",
      copy: "Your choices make future pulls feel more personal over time.",
    },
  ];

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function sendCode() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.requestOtp(email.trim());
      setDelivered(res.delivered);
      setDevCode(res.devCode ?? null);
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code.");
    } finally {
      setLoading(false);
    }
  }

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    await sendCode();
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { user } = await api.verifyOtp(email.trim(), code.trim());
      setUser(user);
      const pendingSaveSlug = window.localStorage.getItem("yns.pendingSaveSlug");
      if (pendingSaveSlug) {
        try {
          await api.saveToLockers(pendingSaveSlug, {});
          window.localStorage.removeItem("yns.pendingSaveSlug");
          window.dispatchEvent(new CustomEvent("yns:saved", { detail: { slug: pendingSaveSlug } }));
        } catch {
          // Auth still succeeded; the visible save action can be retried from the card.
        }
      }
      setStep("success");
      window.setTimeout(onClose, 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-start overflow-y-auto bg-ink-900/88 p-3 backdrop-blur-xl sm:place-items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="locker-dialog-title"
    >
      <div
        className="onboarding-panel auth-panel relative grid max-h-[calc(100vh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[1.45rem] lg:max-w-5xl lg:grid-cols-[1.05fr_0.95fr] lg:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[0.075] text-sm text-mist-300 transition hover:text-white sm:right-4 sm:top-4"
          aria-label="Close Locker"
        >
          ×
        </button>

        <section className="locker-hero relative overflow-hidden border-b border-white/10 p-5 pb-4 sm:p-9 lg:min-h-[580px] lg:border-b-0 lg:border-r">
          <div className="noise" />
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-aqua/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-gilt/10 blur-3xl" />

          <div className="relative">
              <p className="text-[10px] uppercase tracking-[0.24em] text-aqua sm:text-[11px] sm:tracking-[0.34em]">
              Locker locked
            </p>
            <h2 id="locker-dialog-title" className="mt-3 max-w-sm text-[2.35rem] font-semibold leading-[0.95] tracking-[-0.03em] text-mist-100 sm:mt-4 sm:max-w-md sm:font-display sm:text-6xl sm:tracking-[-0.055em]">
              Keep the places worth remembering.
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-mist-300 sm:mt-5 sm:max-w-md sm:text-base sm:leading-7">
              Sign in with one email code. No password, no account ceremony.
                Just your saved spots, verdicts, and a cleaner way to decide next time.
            </p>
          </div>

          <div className="locker-fan relative mt-5 hidden h-40 sm:mt-10 sm:block sm:h-56">
            <div
              className="fan-card absolute left-3 top-8 w-48 rounded-[1.4rem] border border-aqua/25 bg-aqua/10 p-4 shadow-2xl shadow-black/30"
              style={{ "--r": "-8deg", "--d": "5.5s" } as React.CSSProperties}
            >
              <p className="text-[10px] uppercase tracking-[0.24em] text-aqua">
                saved
              </p>
              <p className="mt-8 font-display text-2xl text-mist-100">
                Date night list
              </p>
              <p className="mt-2 text-xs leading-5 text-mist-400">
                7 places ready when the group chat stalls.
              </p>
            </div>
            <div
              className="fan-card absolute left-[30%] top-0 w-52 rounded-[1.4rem] border border-gilt/25 bg-gilt/10 p-4 shadow-2xl shadow-black/30"
              style={{ "--r": "3deg", "--d": "6s" } as React.CSSProperties}
            >
              <p className="text-[10px] uppercase tracking-[0.24em] text-gilt">
                verdict
              </p>
              <p className="mt-8 font-display text-2xl text-mist-100">
                8.9 / 10
              </p>
              <p className="mt-2 text-xs leading-5 text-mist-400">
                Worth the detour. Would bring friends.
              </p>
            </div>
            <div
              className="fan-card absolute right-2 top-11 w-48 rounded-[1.4rem] border border-white/15 bg-white/[0.055] p-4 shadow-2xl shadow-black/30"
              style={{ "--r": "9deg", "--d": "5.2s" } as React.CSSProperties}
            >
              <p className="text-[10px] uppercase tracking-[0.24em] text-mist-400">
                locker
              </p>
              <p className="mt-8 font-display text-2xl text-mist-100">
                Personal atlas
              </p>
              <p className="mt-2 text-xs leading-5 text-mist-400">
                Coffee, bars, restaurants, all in one place.
              </p>
            </div>
          </div>

          <svg
            viewBox="0 0 520 120"
            className="locker-path relative mt-3 hidden h-16 w-full opacity-70 sm:mt-4 sm:block sm:h-24"
            aria-hidden
          >
            <path
              className="draw-path"
              d="M24 88 C 140 10, 210 108, 306 40 S 450 38, 496 78"
              fill="none"
              stroke="#36d6c5"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="24" cy="88" r="4" fill="#f7d774" />
            <circle cx="496" cy="78" r="4" fill="#36d6c5" />
          </svg>
        </section>

        <section className="relative p-5 sm:p-9">
          <div className="mb-5 flex items-center gap-2 sm:mb-7">
            {["intro", "email", "code", "success"].map((s, index) => (
              <span
                key={s}
                className={`h-1.5 flex-1 rounded-full transition ${
                  ["intro", "email", "code", "success"].indexOf(step) >= index
                    ? "bg-aqua"
                    : "bg-white/10"
                }`}
              />
            ))}
          </div>

          {step === "intro" && (
            <div className="animate-rise">
              <p className="text-[11px] uppercase tracking-[0.3em] text-mist-400">
                Why sign in
              </p>
              <h3 className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.02em] text-mist-100 sm:font-display sm:text-4xl">
                Turn the atlas into yours.
              </h3>
              <div className="mt-5 space-y-2.5 sm:mt-7 sm:space-y-3">
                {benefits.map((b) => (
                  <div
                    key={b.k}
                    className="rounded-[1.15rem] border border-white/10 bg-white/[0.045] p-3 sm:rounded-2xl sm:p-4"
                  >
                    <div className="flex gap-3 sm:gap-4">
                      <span className="font-mono text-xs text-aqua">{b.k}</span>
                      <div>
                        <p className="text-sm font-semibold text-mist-100 sm:text-base">{b.title}</p>
                        <p className="mt-1 text-xs leading-5 text-mist-400 sm:text-sm sm:leading-6">
                          {b.copy}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep("email")}
                className="soft-button btn mt-5 w-full bg-mist-100 py-3 text-ink-900 hover:bg-white sm:mt-7 sm:py-4"
              >
                Unlock the Locker
              </button>
              <p className="mt-3 text-center text-xs text-mist-400">
                One email code. No password.
              </p>
            </div>
          )}

          {step === "email" && (
          <form onSubmit={requestCode} className="animate-rise space-y-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-aqua">
              Step 1 of 2
            </p>
            <h3 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-mist-100 sm:font-display sm:text-4xl">
              Where should we send your code?
            </h3>
            <p className="text-sm leading-6 text-mist-400">
              We will email a 6-digit code. It expires in 10 minutes.
            </p>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="input py-3 text-base sm:py-4"
            />
            <button
              type="submit"
              disabled={loading}
              className="soft-button btn w-full bg-mist-100 py-3 text-ink-900 hover:bg-white sm:py-4"
            >
              {loading ? "Sending…" : "Email me a code"}
            </button>
            <button
              type="button"
              onClick={() => setStep("intro")}
              className="btn-ghost w-full text-xs"
            >
              back
            </button>
          </form>
          )}

          {step === "code" && (
          <form onSubmit={verify} className="animate-rise space-y-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-aqua">
              Step 2 of 2
            </p>
            <h3 className="text-2xl font-semibold leading-tight tracking-[-0.02em] text-mist-100 sm:font-display sm:text-4xl">
              Enter the code.
            </h3>
            <p className="text-sm leading-6 text-mist-400">
              {delivered === false ? (
                <>
                  Email delivery is not configured here, so use the dev code for{" "}
                  <span className="text-mist-200">{email}</span>.
                </>
              ) : (
                <>
                  Sent to <span className="text-mist-200">{email}</span>.
                </>
              )}
            </p>
            <input
              inputMode="numeric"
              required
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="input py-3 text-center text-2xl tracking-[0.32em] sm:py-4 sm:text-3xl sm:tracking-[0.4em]"
            />
            {devCode && (
              <p className="rounded-2xl border border-aqua/20 bg-aqua/10 px-3 py-2 text-center text-xs text-aqua">
                Dev mode code: <span className="font-mono">{devCode}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="soft-button btn w-full bg-mist-100 py-3 text-ink-900 hover:bg-white sm:py-4"
            >
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={loading}
              className="btn w-full border border-aqua/20 bg-aqua/10 text-aqua hover:bg-aqua/15"
            >
              Resend code
            </button>
            <button
              type="button"
              onClick={() => setStep("email")}
              className="btn-ghost w-full text-xs"
            >
              use a different email
            </button>
          </form>
          )}

          {step === "success" && (
            <div className="grid min-h-[300px] place-items-center text-center animate-rise sm:min-h-[420px]">
              <div>
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-[1.7rem] border border-aqua/30 bg-aqua/10 text-3xl text-aqua">
                  ✓
                </div>
                <h3 className="mt-6 font-display text-4xl leading-tight text-mist-100">
                  Locker unlocked.
                </h3>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-mist-400">
                  You can now review spots and start building your personal atlas.
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-2xl border border-ember/20 bg-ember/10 px-4 py-3 text-sm text-ember">
              {error}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
