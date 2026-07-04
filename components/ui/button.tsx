import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-gradient-to-r from-aurora-violet to-aurora-cyan text-void shadow-glow hover:brightness-110 hover:scale-[1.03]",
        outline:
          "glass-panel text-fog hover:border-white/30 hover:bg-white/10 hover:scale-[1.03]",
        ghost: "text-mist hover:text-fog",
      },
      size: {
        default: "h-12 px-6",
        sm: "h-10 px-4 text-xs",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    href?: string;
    external?: boolean;
  };

export function Button({ className, variant, size, href, external, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        data-cursor-hover
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {props.children}
      </Link>
    );
  }

  return <button className={classes} data-cursor-hover {...props} />;
}
