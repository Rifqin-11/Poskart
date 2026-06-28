"use client";

import { useCallback, useState } from "react";

export function useBuilderExitGuard({
  hasUnsavedChanges,
  onLeave,
  onSaveAndLeave,
}: {
  hasUnsavedChanges: boolean;
  onLeave: () => void;
  onSaveAndLeave: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const requestLeave = useCallback(() => {
    if (hasUnsavedChanges) {
      setOpen(true);
      return;
    }
    onLeave();
  }, [hasUnsavedChanges, onLeave]);

  const cancelLeave = useCallback(() => setOpen(false), []);

  const discardAndLeave = useCallback(() => {
    setOpen(false);
    onLeave();
  }, [onLeave]);

  const saveAndLeave = useCallback(async () => {
    try {
      await onSaveAndLeave();
      setOpen(false);
    } catch {
      // Caller is responsible for showing the error toast.
    }
  }, [onSaveAndLeave]);

  return {
    showUnsavedDialog: open,
    requestLeave,
    cancelLeave,
    discardAndLeave,
    saveAndLeave,
  };
}
