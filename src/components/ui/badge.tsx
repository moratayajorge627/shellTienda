import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#ED1C24]/10 text-[#ED1C24] border-[#ED1C24]/20 font-bold",
        secondary:
          "border-transparent bg-[#F0F0F0] text-[#222222]",
        accent:
          "border-transparent bg-[#FFD500]/25 text-[#222222] border-[#FFD500]/60 font-bold",
        destructive:
          "border-transparent bg-red-100 text-red-700 border-red-200",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 border-emerald-200",
        warning:
          "border-transparent bg-amber-50 text-amber-800 border-amber-200",
        outline: "text-[#222222] border-[#E2E2E2]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
