import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: { href: string; label: string };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-5 text-center",
        className,
      )}
    >
      {Icon ? <Icon className="mx-auto mb-3 size-6 text-zinc-300" /> : null}
      <div className="text-sm font-semibold text-zinc-700">{title}</div>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-zinc-500">
        {description}
      </p>
      {action ? (
        <Link
          href={action.href}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "mt-4",
          })}
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
