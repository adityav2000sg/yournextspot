import { useState } from "react";
import { api } from "../api";
import { useAuth } from "../lib/auth";

interface Props {
  slug: string;
  saved?: boolean;
  onSignIn: () => void;
  onChange: (saved: boolean) => void;
}

export default function SaveSpotButton({
  slug,
  saved,
  onSignIn,
  onChange,
}: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (!user) {
      onSignIn();
      return;
    }
    setBusy(true);
    try {
      const res = saved ? await api.unsaveSpot(slug) : await api.saveSpot(slug);
      onChange(res.saved);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`btn ${
        saved
          ? "border border-gilt/35 bg-gilt/15 text-gilt hover:bg-gilt/20"
          : "bg-white/10 text-mist-100 hover:bg-white/15"
      }`}
    >
      <span aria-hidden>{saved ? "✓" : "+"}</span>
      {busy ? "Saving..." : saved ? "Saved" : "Save spot"}
    </button>
  );
}
