import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DialogActions({
  submitting,
  submitLabel,
  submittingLabel,
  cancelLabel = "Cancel",
  submitDisabled,
  onCancel,
}: {
  submitting?: boolean;
  submitLabel: string;
  submittingLabel?: string;
  cancelLabel?: string;
  submitDisabled?: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        disabled={submitDisabled || submitting}
        className={cn(submitting && "cursor-wait")}
      >
        {submitting ? (submittingLabel ?? "Saving...") : submitLabel}
      </Button>
    </div>
  );
}
