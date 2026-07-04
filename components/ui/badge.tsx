import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "glass-panel inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-wide text-mist",
        className
      )}
      {...props}
    />
  );
}
