import { useMutation, useQuery } from "convex/react";
import { Camera, ImagePlus, Loader2, Video, X } from "lucide-react";
import { useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

export type UploadPhoto =
  | { kind: "file"; id: Id<"_storage"> }
  | { kind: "url"; url: string };

const MAX_PHOTOS = 6;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

function PhotoThumb({ photo }: { photo: UploadPhoto }) {
  const storageUrl = useQuery(
    api.complaints.photoUrl,
    photo.kind === "file" ? { id: photo.id } : "skip",
  );
  const src = photo.kind === "url" ? photo.url : storageUrl;
  if (!src) {
    return (
      <div className="grid size-full place-items-center bg-white/60">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <img src={src} alt="Complaint photo" className="size-full object-cover" />;
}

/**
 * Mobile-friendly photo evidence picker: camera capture, gallery select and
 * optional video. Files are uploaded to Convex file storage and only storage
 * IDs are stored on the complaint.
 */
export function PhotoUpload({
  value,
  onChange,
  label = "Photos",
  hint = "JPG/PNG/WEBP up to 8 MB · MP4 up to 20 MB",
  max = MAX_PHOTOS,
}: {
  value: UploadPhoto[];
  onChange: (next: UploadPhoto[]) => void;
  label?: string;
  hint?: string;
  max?: number;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.complaints.generateUploadUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      let current = [...value];
      for (const file of Array.from(files)) {
        if (current.length >= max) {
          setError(`Maximum ${max} uploads per complaint.`);
          break;
        }
        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");
        if (!isImage && !isVideo) {
          setError(`Unsupported file type: ${file.name}`);
          continue;
        }
        if (isImage && file.size > MAX_IMAGE_BYTES) {
          setError(`${file.name} is larger than 8 MB.`);
          continue;
        }
        if (isVideo && file.size > MAX_VIDEO_BYTES) {
          setError(`${file.name} is larger than 20 MB.`);
          continue;
        }
        const url = await generateUploadUrl({});
        const result = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) throw new Error(`Upload failed (${result.status})`);
        const { storageId } = (await result.json()) as {
          storageId: Id<"_storage">;
        };
        current = [...current, { kind: "file", id: storageId }];
        onChange(current);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const resetInputs = () => {
    if (cameraInput.current) cameraInput.current.value = "";
    if (galleryInput.current) galleryInput.current.value = "";
    if (videoInput.current) videoInput.current.value = "";
  };

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-sm font-semibold">{label}</label>
        <span className="text-xs text-muted-foreground">
          {value.length}/{max}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((photo, i) => (
          <div
            key={i}
            className="relative aspect-4/3 overflow-hidden rounded-xl border border-white/80 shadow-sm"
          >
            <PhotoThumb photo={photo} />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {value.length < max && (
          <div className="grid aspect-4/3 place-items-center rounded-xl border border-dashed border-sky-300/70 bg-white/45">
            {busy ? (
              <Loader2 className="size-5 animate-spin text-sky-600" />
            ) : (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => cameraInput.current?.click()}
                  className="grid size-9 place-items-center rounded-lg bg-white/85 text-sky-700 shadow-sm transition hover:bg-white"
                  aria-label="Capture with camera"
                  title="Camera"
                >
                  <Camera className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => galleryInput.current?.click()}
                  className="grid size-9 place-items-center rounded-lg bg-white/85 text-sky-700 shadow-sm transition hover:bg-white"
                  aria-label="Choose from gallery"
                  title="Gallery"
                >
                  <ImagePlus className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => videoInput.current?.click()}
                  className="grid size-9 place-items-center rounded-lg bg-white/85 text-sky-700 shadow-sm transition hover:bg-white"
                  aria-label="Attach a video"
                  title="Video"
                >
                  <Video className="size-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
      {error && <p className="mt-1 text-xs font-medium text-rose-600">{error}</p>}

      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="glass-soft border-white/80"
          disabled={busy || value.length >= max}
          onClick={() => cameraInput.current?.click()}
        >
          <Camera className="mr-1.5 size-4" /> Camera
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="glass-soft border-white/80"
          disabled={busy || value.length >= max}
          onClick={() => galleryInput.current?.click()}
        >
          <ImagePlus className="mr-1.5 size-4" /> Gallery
        </Button>
      </div>

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          resetInputs();
        }}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          resetInputs();
        }}
      />
      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          resetInputs();
        }}
      />
    </div>
  );
}

/** Read-only photo grid (complaint detail / resolution proof). */
export function PhotoGrid({ photos }: { photos: UploadPhoto[] }) {
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((p, i) => (
        <a
          key={i}
          href={p.kind === "url" ? p.url : undefined}
          target="_blank"
          rel="noreferrer"
          className="group relative block aspect-4/3 overflow-hidden rounded-xl border border-white/80 shadow-sm"
        >
          <PhotoThumb photo={p} />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-1.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
            View full size
          </span>
        </a>
      ))}
    </div>
  );
}
