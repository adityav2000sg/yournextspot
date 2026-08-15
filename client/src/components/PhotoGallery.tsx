import { useMemo, useRef, useState } from "react";
import { api } from "../api";
import type { SpotPhoto } from "../types";

interface Props {
  slug: string;
  coverImageUrl?: string | null;
  photos: SpotPhoto[];
  signedIn: boolean;
  onSignIn: () => void;
  onChange: (photos: SpotPhoto[]) => void;
}

async function prepareImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Could not decode that image."));
    element.src = source;
  });
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the image.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const mimeType = "image/jpeg" as const;
  const dataUrl = canvas.toDataURL(mimeType, 0.84);
  return { imageBase64: dataUrl.split(",")[1], mimeType, preview: dataUrl };
}

export default function PhotoGallery({ slug, coverImageUrl, photos, signedIn, onSignIn, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [prepared, setPrepared] = useState<{ imageBase64: string; mimeType: "image/jpeg"; preview: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gallery = useMemo(() => {
    const items = [...photos];
    if (coverImageUrl && !items.some((photo) => photo.imageUrl === coverImageUrl)) {
      items.unshift({
        id: `cover-${slug}`,
        imageUrl: coverImageUrl,
        caption: null,
        visibility: "public",
        status: "approved",
        createdAt: "",
        mine: false,
      });
    }
    return items;
  }, [coverImageUrl, photos, slug]);

  async function choose(file?: File) {
    if (!file) return;
    setError(null);
    try {
      setPrepared(await prepareImage(file));
    } catch (reason) {
      setPrepared(null);
      setError(reason instanceof Error ? reason.message : "Could not prepare that image.");
    }
  }

  async function upload() {
    if (!prepared) return;
    setBusy(true);
    setError(null);
    try {
      const { photo } = await api.uploadPhoto(slug, {
        imageBase64: prepared.imageBase64,
        mimeType: prepared.mimeType,
        caption: caption.trim() || null,
        visibility,
      });
      onChange([photo, ...photos]);
      setPrepared(null);
      setCaption("");
      setVisibility("private");
      if (inputRef.current) inputRef.current.value = "";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload that photo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(photo: SpotPhoto) {
    setBusy(true);
    setError(null);
    try {
      await api.deletePhoto(photo.id);
      onChange(photos.filter((item) => item.id !== photo.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete that photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="photo-section" aria-labelledby="photos-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">From the table</p>
          <h2 id="photos-title" className="mt-1 text-2xl font-semibold text-mist-100 sm:text-3xl">Photos from people who went</h2>
          <p className="mt-2 text-sm text-mist-400">Public photos help the group decide. Private photos stay in your account.</p>
        </div>
        {!signedIn && (
          <button type="button" onClick={onSignIn} className="btn-secondary">Sign in to add photos</button>
        )}
      </div>

      {gallery.length > 0 ? (
        <div className="photo-grid mt-5">
          {gallery.map((photo, index) => (
            <figure key={photo.id} className={`photo-tile ${index === 0 ? "is-featured" : ""}`}>
              <img src={photo.imageUrl} alt={photo.caption || `Photo of this place ${index + 1}`} loading="lazy" />
              {(photo.caption || photo.mine) && (
                <figcaption>
                  <span>{photo.caption || "Your photo"}</span>
                  {photo.mine && <span className="photo-privacy">{photo.visibility === "private" ? "Only you" : "Public"}</span>}
                </figcaption>
              )}
              {photo.mine && (
                <button type="button" disabled={busy} onClick={() => void remove(photo)} className="photo-remove" aria-label="Delete your photo">×</button>
              )}
            </figure>
          ))}
        </div>
      ) : (
        <div className="empty-photo-state mt-5">
          <span aria-hidden>◎</span>
          <p>No member photos yet. The first honest photo is more useful than a stock image.</p>
        </div>
      )}

      {signedIn && (
        <div className="photo-uploader mt-5">
          <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
            <button type="button" onClick={() => inputRef.current?.click()} className="photo-picker">
              {prepared ? <img src={prepared.preview} alt="Photo ready to upload" /> : <><span aria-hidden>＋</span><span>Choose a photo</span></>}
            </button>
            <div className="grid gap-3">
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => void choose(event.target.files?.[0])}
              />
              <label className="text-sm font-semibold text-mist-300">
                Caption
                <input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={180} className="input mt-2" placeholder="What should people notice?" />
              </label>
              <fieldset>
                <legend className="text-sm font-semibold text-mist-300">Who can see it?</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className={`privacy-choice ${visibility === "private" ? "is-selected" : ""}`}>
                    <input type="radio" name="photo-visibility" value="private" checked={visibility === "private"} onChange={() => setVisibility("private")} />
                    <span><strong>Only me</strong><small>Keep it with your private food log.</small></span>
                  </label>
                  <label className={`privacy-choice ${visibility === "public" ? "is-selected" : ""}`}>
                    <input type="radio" name="photo-visibility" value="public" checked={visibility === "public"} onChange={() => setVisibility("public")} />
                    <span><strong>Share publicly</strong><small>Show it on this place for everyone.</small></span>
                  </label>
                </div>
              </fieldset>
              <button type="button" disabled={!prepared || busy} onClick={() => void upload()} className="btn-primary w-full sm:w-max">
                {busy ? "Uploading…" : "Add photo"}
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="mt-3 rounded-xl border border-ember/25 bg-ember/10 px-3 py-2 text-sm text-ember">{error}</p>}
    </section>
  );
}
