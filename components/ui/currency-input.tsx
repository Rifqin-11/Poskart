import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type CurrencyInputProps = Omit<
  ComponentProps<typeof Input>,
  "type" | "value" | "onChange"
> & {
  value?: number | null;
  onValueChange: (value: number | null) => void;
};

export function formatRupiahInput(value?: number | null) {
  if (value == null || !Number.isFinite(value)) return "";
  return Math.max(0, Math.trunc(value)).toLocaleString("id-ID");
}

export function parseRupiahInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return null;

  const amount = Number(digits);
  return Number.isSafeInteger(amount) ? amount : null;
}

export function CurrencyInput({
  className,
  value,
  onValueChange,
  ...props
}: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
        Rp
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        className={cn("pl-10", className)}
        value={formatRupiahInput(value)}
        onChange={(event) => onValueChange(parseRupiahInput(event.target.value))}
      />
    </div>
  );
}
