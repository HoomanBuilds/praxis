import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { DocBlock } from "@/docs/types";
import { headingId } from "./docs-utils";
import { cn } from "@/lib/utils";

function InlineText({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="docs-mono rounded-[6px] bg-[#F3F4F6] px-1.5 py-0.5 text-[0.85em] text-[#111827]">
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function CodeBlock({ text, lang }: { text: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="my-8">
      <div className="flex items-center justify-between rounded-t-[12px] border border-b-0 border-[#1F2937] bg-[#0B0F19] px-6 pb-2 pt-4">
        <span className="docs-mono text-[11px] font-medium uppercase tracking-wider text-[#6B7280]">
          {lang || "bash"}
        </span>
        <button
          onClick={onCopy}
          aria-label="Copy code"
          className="docs-mono inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-[#9CA3AF] transition-colors duration-150 hover:bg-[#1F2937] hover:text-white"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-[#4ADE80]" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="docs-mono overflow-x-auto rounded-b-[12px] border border-[#1F2937] bg-[#0B0F19] p-6 text-[15px] leading-7 text-[#D1D5DB]">
        <code>{text}</code>
      </pre>
    </div>
  );
}

const CALLOUT_STYLES = {
  note: { box: "border-[#3B82F6] bg-[#EFF6FF]", title: "text-[#1D4ED8]", text: "text-[#1E40AF]" },
  tip: { box: "border-[#22C55E] bg-[#F0FDF4]", title: "text-[#15803D]", text: "text-[#166534]" },
  warning: { box: "border-[#F59E0B] bg-[#FFFBEB]", title: "text-[#B45309]", text: "text-[#92400E]" },
  danger: { box: "border-[#EF4444] bg-[#FEF2F2]", title: "text-[#B91C1C]", text: "text-[#991B1B]" },
} as const;

export function DocBlocks({ blocks }: { blocks: DocBlock[] }) {
  return (
    <div className="docs-font text-[18px] leading-[1.8] text-[#374151]">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2
                key={i}
                id={headingId(b.text)}
                className="mt-16 mb-4 scroll-mt-24 text-[20px] font-bold tracking-tight text-[#111827] first:mt-0"
              >
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={i}
                id={headingId(b.text)}
                className="mt-10 mb-3 scroll-mt-24 text-[16px] font-bold tracking-tight text-[#111827]"
              >
                {b.text}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="my-6 max-w-[70ch]">
                <InlineText text={b.text} />
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="my-6 max-w-[70ch] space-y-4">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-[13px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#D1D5DB]" />
                    <span>
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="my-6 max-w-[70ch] space-y-4">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3.5">
                    <span className="mt-0.5 shrink-0 text-[16px] font-semibold text-[#9CA3AF] tabular">{j + 1}.</span>
                    <span>
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ol>
            );
          case "code":
            return <CodeBlock key={i} text={b.text} lang={b.lang} />;
          case "table":
            return (
              <div key={i} className="my-8 overflow-x-auto rounded-[12px] border border-[#E5E7EB]">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                      {b.headers.map((h, j) => (
                        <th key={j} className="px-5 py-3 text-left text-[13px] font-semibold text-[#111827]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {b.rows.map((row, j) => (
                      <tr key={j} className="align-top">
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            className={cn(
                              "px-5 py-3 text-[15px] leading-7",
                              k === 0 ? "font-medium text-[#111827]" : "text-[#6B7280]",
                            )}
                          >
                            <InlineText text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "callout": {
            const s = CALLOUT_STYLES[b.variant];
            return (
              <div key={i} className={cn("my-8 rounded-[12px] border-l-4 py-4 pl-5 pr-5", s.box)}>
                <p className={cn("text-[15px] font-semibold", s.title)}>{b.title}</p>
                <p className={cn("mt-1 text-[15px] leading-7", s.text)}>
                  <InlineText text={b.text} />
                </p>
              </div>
            );
          }
        }
      })}
    </div>
  );
}
