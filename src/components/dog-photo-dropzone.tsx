"use client";

import { useCallback, useId, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";

import { FOTO_PODGLAD_MAX_BYTES } from "@/lib/foto-podglad-schema";
import { cn } from "@/lib/utils";

const MAX_MB = FOTO_PODGLAD_MAX_BYTES / (1024 * 1024);

export type DogPhotoDropzoneProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string | null;
  disabled?: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DogPhotoDropzone({
  value,
  onChange,
  error,
  disabled,
}: DogPhotoDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const setFile = useCallback(
    (file: File | null) => {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return file ? URL.createObjectURL(file) : null;
      });
      onChange(file);
    },
    [onChange]
  );

  const pickFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      setFile(file);
    },
    [disabled, setFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      pickFile(e.dataTransfer.files?.[0]);
    },
    [disabled, pickFile]
  );

  return (
    <div className="space-y-2">
      <label
        htmlFor={inputId}
        className={cn(
          "relative flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-[border-color,background-color] duration-200",
          dragOver &&
            "border-[color-mix(in_oklab,var(--accent)_55%,var(--border))] bg-[color-mix(in_oklab,var(--accent)_10%,var(--card))]",
          !dragOver &&
            "border-border bg-[color-mix(in_oklab,var(--accent)_4%,var(--card))] hover:border-[color-mix(in_oklab,var(--accent)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--accent)_8%,var(--card))]",
          error && "border-destructive/50",
          disabled && "pointer-events-none opacity-50"
        )}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragOver(false);
        }}
        onDrop={onDrop}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/*"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {previewUrl && value ? (
          <div className="relative w-full max-w-xs">
            {/* eslint-disable-next-line @next/next/no-img-element -- podgląd lokalnego pliku */}
            <img
              src={previewUrl}
              alt="Podgląd zdjęcia psa"
              className="mx-auto max-h-40 w-auto rounded-lg object-contain shadow-sm ring-1 ring-foreground/10"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {value.name} · {formatBytes(value.size)}
            </p>
          </div>
        ) : (
          <>
            <div className="flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[color-mix(in_oklab,var(--accent)_88%,var(--foreground))]">
              <ImagePlus className="size-6" aria-hidden />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Przeciągnij zdjęcie tutaj lub kliknij, aby wybrać plik
              </p>
              <p className="text-xs text-muted-foreground">
                Obrazy do {MAX_MB} MB (JPEG, PNG, WebP, GIF)
              </p>
            </div>
          </>
        )}
      </label>

      {value ? (
        <div className="flex justify-center">
          <button
            type="button"
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            <X className="size-3.5" aria-hidden />
            Usuń zdjęcie
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
