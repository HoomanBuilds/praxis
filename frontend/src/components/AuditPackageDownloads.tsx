import { useEffect, useRef, useState } from "react";
import { Check, Download, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

function fileType(filename: string) {
  return filename.split(".").pop()?.toUpperCase() || "file";
}

function AuditDownloadButton({ filename }: { filename: string }) {
  const [state, setState] = useState<"idle" | "downloading" | "downloaded">("idle");
  const [error, setError] = useState("");
  const resetTimer = useRef<number | null>(null);
  const type = fileType(filename);

  useEffect(() => () => {
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
  }, []);

  const download = async () => {
    setState("downloading");
    setError("");
    try {
      await api.downloadAuditFile(filename);
      setState("downloaded");
      resetTimer.current = window.setTimeout(() => setState("idle"), 1800);
    } catch (downloadError) {
      setState("idle");
      setError(downloadError instanceof Error ? downloadError.message : "Download failed. Try again.");
    }
  };

  return (
    <div className="min-w-0">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={state === "downloading"}
        aria-label={`Download ${filename}`}
        title={filename}
        className="h-auto min-h-11 max-w-full justify-start whitespace-normal px-3 py-2 text-left"
        onClick={() => void download()}
      >
        {state === "downloading" ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        ) : state === "downloaded" ? (
          <Check className="h-4 w-4 shrink-0 text-success" />
        ) : (
          <Download className="h-4 w-4 shrink-0" />
        )}
        {state === "downloading" ? `Downloading ${type}` : state === "downloaded" ? `${type} downloaded` : `Download ${type}`}
      </Button>
      {error && <div role="alert" className="mt-1 max-w-64 text-xs text-destructive">{error}</div>}
    </div>
  );
}

export function AuditPackageDownloads({ files, label = "Package ready" }: { files: string[]; label?: string }) {
  if (!files.length) return null;
  return (
    <div role="status" aria-label={label} className="rounded-lg border border-success/40 bg-success/5 p-3 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <Check className="h-4 w-4 text-success" />
        {label}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {files.map((filename) => <AuditDownloadButton key={filename} filename={filename} />)}
      </div>
    </div>
  );
}
