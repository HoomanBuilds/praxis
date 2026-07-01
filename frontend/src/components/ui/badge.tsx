import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      // Monochrome: state is conveyed by fill vs. outline, not colour.
      variant: {
        default: "border-transparent bg-foreground text-background",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground border-border",
        success: "border-transparent bg-foreground text-background",       // approved / high → solid
        warning: "border-border bg-muted text-foreground",                 // pending / mid → filled-muted
        destructive: "border border-foreground/40 text-foreground bg-transparent", // rejected / low → outlined
        muted: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
