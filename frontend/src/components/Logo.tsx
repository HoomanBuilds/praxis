import { cn } from "@/lib/utils";

// Transparent vector mark — recolors with the theme (dark in light mode, white in dark mode),
// so it is always crisp and legible with no baked-in background.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      className={cn("shrink-0", className)}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="praxis"
    >
      <rect x="316" y="262" width="300" height="158" rx="16" />
      <path d="M300 762 L300 600 A170 170 0 0 1 470 430 L770 430 L770 762 L620 762 L620 590 A85 85 0 0 0 450 590 L450 762 Z" />
    </svg>
  );
}
