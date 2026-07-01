"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DialogActions } from "@/features/admin/_components/dialog-actions";

type AddMemberDialogProps = {
  open: boolean;
  submitting: boolean;
  myEmail: string;
  onClose: () => void;
  onSubmit: (email: string) => void;
};

export function AddMemberDialog({
  open,
  submitting,
  myEmail,
  onClose,
  onSubmit,
}: AddMemberDialogProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || email === myEmail) return;
    onSubmit(email);
    setEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Invite Team Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-xs font-medium text-zinc-600">
          Email Address
          <Input
            type="email"
            className="mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            required
          />
        </label>
        <DialogActions
          submitting={submitting}
          submitDisabled={!email.trim() || email === myEmail}
          submitLabel="Send Invitation"
          submittingLabel="Sending..."
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}
