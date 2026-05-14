"use client";

import { useState, useTransition } from "react";
import { uploadLibraryImage } from "../actions";

export interface CoverImageFieldProps {
  name: string;
  defaultValue?: string;
  // Used as a path prefix in storage so files don't collide across pages.
  slugHint?: string;
}

// Two ways to set a cover image:
//   1. Paste a URL directly (e.g. a Cloudinary or external link).
//   2. Upload a file → server action puts it in Supabase Storage, returns
//      the public URL, and we set it on the URL field.
//
// The actual form value is always the URL (in the hidden input). The file
// input is just an affordance — once upload completes, file input clears
// itself and we store the result URL.
export function CoverImageField({
  name,
  defaultValue = "",
  slugHint = "untitled",
}: CoverImageFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so re-selecting same file fires the event
    if (!file) return;

    setError(null);
    startUpload(async () => {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("filename", file.name);
      fd.set("slug", slugHint);
      const result = await uploadLibraryImage(fd);
      if (!result.ok) {
        setError(result.error ?? "Upload failed.");
        return;
      }
      setValue(result.url ?? "");
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <input
          type="text"
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://… (paste URL or upload below)"
          className="flex-1 border border-rule-strong bg-surface rounded-[2px] px-[14px] py-3 font-mono text-[13px] text-ink focus:outline-none focus:border-accent"
        />
        <label className="cursor-pointer">
          <span className="inline-flex items-center px-4 py-3 border border-dashed border-rule-strong rounded-[2px] font-sans text-[13px] text-ink-mute hover:border-accent hover:text-accent transition-colors">
            {isUploading ? "Uploading…" : "+ Upload"}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <p className="font-mono text-[11px] tracking-[0.05em] text-[var(--warning)]">
          {error}
        </p>
      )}

      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Cover preview"
          className="max-w-[280px] border border-rule rounded-[2px]"
          onError={() => setError("Couldn't load that URL as an image.")}
        />
      )}
    </div>
  );
}
