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
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail === myEmail.trim().toLowerCase()) return;
    onSubmit(normalizedEmail);
    setEmail("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} title="Invite Team Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm leading-6 text-zinc-500">
          We&apos;ll email this person a secure invitation link. They must accept it before joining the workspace.
        </p>
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
          submitDisabled={!email.trim() || email.trim().toLowerCase() === myEmail.trim().toLowerCase()}
          submitLabel="Send Invitation"
          submittingLabel="Sending..."
          onCancel={onClose}
        />
      </form>
    </Dialog>
  );
}
