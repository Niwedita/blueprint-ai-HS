import { useCallback, useRef, useState } from "react";
import { FileUp, FileText, Loader2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_MB = 15;
const ACCEPT = ".pdf,.docx,.txt";

interface Props {
  onSubmit: (file: File) => void;
  onTrySample: () => void;
  isProcessing: boolean;
}

export function UploadPanel({ onSubmit, onTrySample, isProcessing }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File | null | undefined) => {
    setError(null);
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File exceeds ${MAX_MB}MB limit.`);
      return;
    }
    const name = f.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".docx") && !name.endsWith(".txt")) {
      setError("Only PDF, DOCX, or TXT files are supported.");
      return;
    }
    setFile(f);
  }, []);

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          "group relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-surface p-8 text-center transition-all",
          dragActive
            ? "border-accent bg-accent/5"
            : "border-border hover:border-foreground/30 hover:bg-muted",
          file && "cursor-default",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {!file ? (
          <>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors group-hover:bg-foreground/5 group-hover:text-foreground">
              <FileUp className="h-5 w-5" />
            </div>
            <p className="text-base font-medium text-foreground">
              Drop your discovery document
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              PDF, DOCX or TXT · up to {MAX_MB}MB
            </p>
            <button
              type="button"
              className="mt-4 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-panel transition-colors hover:bg-muted"
            >
              Choose file
            </button>
          </>
        ) : (
          <div className="flex w-full items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent-foreground">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              disabled={isProcessing}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!file || isProcessing}
        onClick={() => file && onSubmit(file)}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all",
          "hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating blueprint…
          </>
        ) : (
          <>Generate blueprint</>
        )}
      </button>
      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          or
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        disabled={isProcessing}
        onClick={onTrySample}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-accent/50 bg-accent/5 px-4 py-2.5 text-sm font-medium text-foreground transition-colors",
          "hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <Sparkles className="h-4 w-4 text-accent" />
        Try sample project
        <span className="rounded-full border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Demo
        </span>
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Your document is analyzed in-session. Nothing is stored.
      </p>
    </div>
  );
}
