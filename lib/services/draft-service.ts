/**
 * draft-service.ts
 *
 * All builder state is persisted to localStorage so users never lose work.
 *
 * Two storage slots:
 *  - AUTOSAVE_KEY  — single "last state" slot updated on every auto-save
 *  - DRAFTS_KEY    — array of user-named local drafts (Save Local button)
 *
 * DB is only written when the user explicitly clicks "Save theme".
 */

import type { LayoutSchema } from "@/types/builder";

const AUTOSAVE_KEY = "poskart_builder_autosave";
const DRAFTS_KEY = "poskart_builder_drafts";

export type LocalDraft = {
  id: string;
  name: string;
  savedAt: string; // ISO timestamp
  schema: LayoutSchema;
};

// ── Auto-save (single slot) ──────────────────────────────────

export function autoSaveSchema(schema: LayoutSchema): void {
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ schema, savedAt: new Date().toISOString() }));
  } catch {
    // Storage full — silently ignore
  }
}

export function getAutoSave(): { schema: LayoutSchema; savedAt: string } | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { schema: LayoutSchema; savedAt: string };
  } catch {
    return null;
  }
}

export function clearAutoSave(): void {
  try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* ignore */ }
}

// ── Named local drafts ───────────────────────────────────────

export function getDrafts(): LocalDraft[] {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as LocalDraft[];
  } catch {
    return [];
  }
}

export function saveDraft(name: string, schema: LayoutSchema): LocalDraft {
  const drafts = getDrafts();
  const draft: LocalDraft = {
    id: `draft-${Date.now()}`,
    name,
    savedAt: new Date().toISOString(),
    schema,
  };
  drafts.unshift(draft); // newest first
  // Keep at most 20 local drafts
  const trimmed = drafts.slice(0, 20);
  try {
    localStorage.setItem(DRAFTS_KEY, JSON.stringify(trimmed));
  } catch {
    // If storage full, try saving just the newest 5
    try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(trimmed.slice(0, 5))); } catch { /* ignore */ }
  }
  return draft;
}

export function deleteDraft(id: string): void {
  const drafts = getDrafts().filter((d) => d.id !== id);
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* ignore */ }
}

export function renameDraft(id: string, newName: string): void {
  const drafts = getDrafts().map((d) => d.id === id ? { ...d, name: newName } : d);
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* ignore */ }
}

// ── Helpers ──────────────────────────────────────────────────

/** Human-readable relative time, e.g. "3 min ago" */
export function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
