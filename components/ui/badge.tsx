import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive/10 text-destructive border-destructive/20",
        outline: "text-foreground",
        success:
          "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        warning:
          "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        info:
          "border-transparent bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
        purple:
          "border-transparent bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
