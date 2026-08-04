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
          <code key={i} className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[0.85em] text-gray-800">
            {part}
          </code>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function CodeBlock({ text }: { text: string }) {
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
    <div className="group relative my-5">
      <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-900 p-4 text-[13px] leading-relaxed text-gray-100">
        <code>{text}</code>
      </pre>
      <button
        onClick={onCopy}
        aria-label="Copy code"
        className="absolute right-2 top-2 rounded-md border border-gray-700 bg-gray-800 p-1.5 text-gray-400 opacity-0 transition-opacity hover:text-white focus:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

const CALLOUT_STYLES = {
  note: { box: "border-blue-200 bg-blue-50", title: "text-blue-900", text: "text-blue-900/80" },
  tip: { box: "border-green-200 bg-green-50", title: "text-green-900", text: "text-green-900/80" },
  warning: { box: "border-amber-200 bg-amber-50", title: "text-amber-900", text: "text-amber-900/80" },
} as const;

export function DocBlocks({ blocks }: { blocks: DocBlock[] }) {
  return (
    <div className="text-[15px] leading-7 text-gray-700">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2
                key={i}
                id={headingId(b.text)}
                className="mt-10 mb-3 scroll-mt-24 text-xl font-semibold tracking-tight text-gray-900 first:mt-0"
              >
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={i}
                id={headingId(b.text)}
                className="mt-8 mb-2 scroll-mt-24 text-[17px] font-semibold tracking-tight text-gray-900"
              >
                {b.text}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="my-4">
                <InlineText text={b.text} />
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="my-4 space-y-2">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                    <span>
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="my-4 space-y-2">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0 text-sm font-semibold text-gray-400 tabular">{j + 1}.</span>
                    <span>
                      <InlineText text={item} />
                    </span>
                  </li>
                ))}
              </ol>
            );
          case "code":
            return <CodeBlock key={i} text={b.text} />;
          case "table":
            return (
              <div key={i} className="my-5 overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      {b.headers.map((h, j) => (
                        <th key={j} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {b.rows.map((row, j) => (
                      <tr key={j} className="align-top">
                        {row.map((cell, k) => (
                          <td key={k} className={cn("px-3 py-2.5 text-[13px] leading-6", k === 0 ? "font-medium text-gray-900" : "text-gray-600")}>
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
              <div key={i} className={cn("my-5 rounded-lg border-l-4 px-4 py-3", s.box)}>
                <p className={cn("text-sm font-semibold", s.title)}>{b.title}</p>
                <p className={cn("mt-0.5 text-sm leading-6", s.text)}>
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
