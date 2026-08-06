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
          <code key={i} className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[.875em] text-[var(--ink)]" style={{ fontFamily: "var(--mono)" }}>
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
    <div className="my-6 overflow-hidden rounded-[10px] border border-[var(--line)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-3 py-2">
        <span style={{ fontFamily: "var(--mono)" }} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">
          {lang || "bash"}
        </span>
        <button
          onClick={onCopy}
          aria-label="Copy code"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-[var(--ink-3)] transition-colors duration-120 hover:text-[var(--ink)]",
            copied && "text-[var(--ink)]",
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-[#FCFCFD] p-4 text-[13px] leading-[22px]" style={{ fontFamily: "var(--mono)" }}>
        <code className="text-[var(--ink)]">{text}</code>
      </pre>
    </div>
  );
}

const CALLOUT_STYLES = {
  note: { box: "border border-[var(--line-2)] bg-[var(--surface)]", icon: "var(--ink-3)", text: "text-[var(--ink-body)]" },
  tip: { box: "border border-[color-mix(in_srgb,var(--ok)_28%,transparent)] bg-[color-mix(in_srgb,var(--ok)_6%,transparent)]", icon: "#1A7F4B", text: "text-[var(--ink-body)]" },
  warning: { box: "border border-[color-mix(in_srgb,#9A6400_30%,transparent)] bg-[color-mix(in_srgb,#9A6400_7%,transparent)]", icon: "#9A6400", text: "text-[var(--ink-body)]" },
  danger: { box: "border border-[color-mix(in_srgb,#B4232A_30%,transparent)] bg-[color-mix(in_srgb,#B4232A_6%,transparent)]", icon: "#B4232A", text: "text-[var(--ink-body)]" },
} as const;

export function DocBlocks({ blocks }: { blocks: DocBlock[] }) {
  return (
    <div className="docs-font text-[var(--t-body)] leading-[var(--l-body)] tracking-[var(--ls-body)] text-[var(--ink-body)]">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h2":
            return (
              <h2
                key={i}
                id={headingId(b.text)}
                className="mb-3 scroll-mt-24 text-[var(--t-h2)] leading-[var(--l-h2)] font-semibold tracking-[var(--ls-h2)] text-[var(--ink)]"
                style={{ marginTop: "var(--h-top)" }}
              >
                {b.text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={i}
                id={headingId(b.text)}
                className="mb-1.5 scroll-mt-24 text-[var(--t-h3)] leading-[var(--l-h3)] font-semibold tracking-[var(--ls-h3)] text-[var(--ink)]"
                style={{ marginTop: "var(--h-top)" }}
              >
                {b.text}
              </h3>
            );
          case "p":
            return (
              <p key={i} className="my-4" style={{ maxWidth: "624px", textWrap: "pretty" }}>
                <InlineText text={b.text} />
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="my-4" style={{ paddingInlineStart: "var(--list-inset)" }}>
                {b.items.map((item, j) => (
                  <li key={j} className="mb-2" style={{ marginBottom: "var(--block-sm)" }}>
                    <InlineText text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="my-4" style={{ paddingInlineStart: "var(--list-inset)" }}>
                {b.items.map((item, j) => (
                  <li key={j} className="mb-2 flex gap-3.5" style={{ marginBottom: "var(--block-sm)" }}>
                    <span className="shrink-0 font-medium text-[var(--ink-4)] tabular">{j + 1}.</span>
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
              <div key={i} className="my-6 overflow-x-auto">
                <table className="w-full border-collapse text-[var(--t-sm)] leading-[var(--l-sm)] tracking-[var(--ls-sm)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <thead>
                    <tr className="border-b border-[var(--line-2)]">
                      {b.headers.map((h, j) => (
                        <th key={j} className="pb-2 text-left text-[12px] font-semibold uppercase tracking-[0.055em] text-[var(--ink-3)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j} className="align-top border-b border-[var(--line)] transition-colors duration-120 hover:bg-[var(--surface)]">
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            className={cn(
                              "py-3 leading-[24px]",
                              k === 0 ? "font-medium text-[var(--ink)]" : "text-[var(--ink-body)]",
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
              <div key={i} className={cn("my-6 rounded-[10px] py-3 pl-[42px] pr-4 relative", s.box)}>
                <p className="text-[var(--t-body)] font-medium text-[var(--ink)]">{b.title}</p>
                <p className={cn("mt-1 text-[var(--t-body)] leading-[var(--l-body)]", s.text)}>
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
