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
      className="docs-font inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-4 text-[14px] font-medium text-[#6B7280] transition-colors duration-150 hover:bg-[#F9FAFB] hover:text-[#111827]"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-[#22C55E]" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
