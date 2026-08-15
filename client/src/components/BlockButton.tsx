import { useState } from "react";
import { api } from "../api";

interface Props {
  userId: string;
  onBlocked: (userId: string) => void;
}

export default function BlockButton({ userId, onBlocked }: Props) {
  const [busy, setBusy] = useState(false);

  async function block() {
    if (busy) return;
    const confirmed = window.confirm("Block this member? Their reviews and photos will disappear from your experience.");
    if (!confirmed) return;
    setBusy(true);
    try {
      await api.blockUser(userId);
      onBlocked(userId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not block that member.");
      setBusy(false);
    }
  }

  return (
    <button type="button" disabled={busy} onClick={() => void block()} className="text-xs text-mist-500 transition hover:text-ember disabled:opacity-50">
      {busy ? "Blocking…" : "Block member"}
    </button>
  );
}
