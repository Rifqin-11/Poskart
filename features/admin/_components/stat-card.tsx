import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatCardTone = "neutral" | "success" | "danger";

const toneClasses: Record<StatCardTone, string> = {
  neutral: "bg-zinc-100 text-zinc-700",
  success: "bg-emerald-50 text-emerald-700",
  danger: "bg-red-50 text-red-700",
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "neutral",
  variant = "compact",
  className,
}: {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  tone?: StatCardTone;
  variant?: "compact" | "spacious";
  className?: string;
}) {
  if (variant === "spacious") {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <div className="text-sm text-zinc-500">{title}</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight">
              {value}
            </div>
            {description ? (
              <p className="mt-1 text-xs text-zinc-500">{description}</p>
            ) : null}
          </div>
          <div
            className={cn(
              "grid size-11 place-items-center rounded-xl",
              toneClasses[tone],
            )}
          >
            <Icon className="size-5" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-1 md:p-5 md:pb-2">
        <CardTitle className="text-xs font-medium text-zinc-500">
          {title}
        </CardTitle>
        <div
          className={cn(
            "grid size-8 place-items-center rounded-lg",
            toneClasses[tone],
          )}
        >
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 md:p-5 md:pt-0">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {description ? (
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
