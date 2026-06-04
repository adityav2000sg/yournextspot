import { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import AuthModal from "./components/AuthModal";
import Home from "./pages/Home";
import SpotDetail from "./pages/SpotDetail";

function Header({ onSignIn }: { onSignIn: () => void }) {
  const { user, logout } = useAuth();
  return (
    <header className="pointer-events-none sticky top-0 z-40 px-4 pt-4">
      <div className="glass pointer-events-auto mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-3 shadow-2xl shadow-black/20 sm:px-5">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] p-[1px]">
            <span className="grid h-full w-full place-items-center rounded-full bg-ink-900 text-sm shadow-inner shadow-white/10">
              <span className="text-shimmer">✦</span>
            </span>
          </span>
          <span className="font-display text-lg tracking-tight text-mist-100 sm:text-xl">
            Your<span className="text-shimmer">Next</span>Spot
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          {user ? (
            <>
              <span className="hidden px-3 text-sm text-mist-400 sm:inline">
                {user.displayName ?? user.email}
              </span>
              <button onClick={() => void logout()} className="btn-ghost text-sm">
                sign out
              </button>
            </>
          ) : (
            <button
              onClick={onSignIn}
              className="btn bg-white/10 text-sm text-mist-100 hover:bg-white/15"
            >
              The Locker
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function Shell() {
  const [authOpen, setAuthOpen] = useState(false);
  return (
    <div className="min-h-full overflow-hidden">
      <Header onSignIn={() => setAuthOpen(true)} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/spot/:slug" element={<SpotDetail onSignIn={() => setAuthOpen(true)} />} />
      </Routes>
      <footer className="mx-auto max-w-6xl px-5 pb-10 pt-4 text-center text-xs text-mist-400">
        <div className="glass rounded-full px-5 py-3">
          Built to erase decision fatigue · Singapore · YourNextSpot
        </div>
      </footer>
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}
