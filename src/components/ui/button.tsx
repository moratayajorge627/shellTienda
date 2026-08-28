import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ED1C24] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-[#ED1C24] text-white hover:bg-[#C9151C] shadow-md shadow-red-500/20 font-semibold",
        destructive: "bg-[#ED1C24] text-white hover:bg-[#C9151C] shadow-md shadow-red-500/20 font-semibold",
        outline: "border border-[#E2E2E2] bg-white text-[#222222] hover:bg-[#F7F7F7] hover:border-[#D0D0D0]",
        secondary: "bg-[#F0F0F0] text-[#222222] hover:bg-[#E5E5E5] font-medium",
        ghost: "hover:bg-[#F7F7F7] text-[#222222]",
        link: "text-[#ED1C24] underline-offset-4 hover:underline font-semibold",
        accent: "bg-[#FFD500] text-[#222222] hover:bg-[#E6C000] font-bold shadow-md shadow-yellow-500/20",
        success: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20",
        warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/20",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base font-semibold",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
