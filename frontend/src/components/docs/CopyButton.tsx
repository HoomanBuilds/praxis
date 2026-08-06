import { useCallback, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text, label = "Copy page" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — ignore */
    }
  }, [text]);

  return (
    <button
      onClick={onCopy}
      className="docs-font inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--line-2)] bg-white px-3 text-[13px] font-medium text-[var(--ink-2)] transition-colors duration-120 hover:border-[var(--ink-4)] hover:text-[var(--ink)]"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
