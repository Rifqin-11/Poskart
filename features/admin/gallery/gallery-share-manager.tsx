"use client";

import {
  Check,
  CircleHelp,
  Copy,
  ExternalLink,
  FolderOpen,
  Images,
  Info,
  Loader2,
  Pencil,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { showErrorToast, toast } from "@/lib/toast";

import {
  createSharedGallery,
  deleteSharedGallery,
  updateSharedGallery,
} from "@/app/(admin)/gallery/actions";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import type { SharedGallerySummary } from "@/features/admin/gallery/gallery-share-types";
import { cn } from "@/lib/utils";
import {
  FeatureGuidedTour,
  type FeatureTourStep,
} from "@/features/admin/tutorial/feature-guided-tour";
import { useFeatureTutorial } from "@/features/admin/tutorial/use-feature-tutorial";

type GalleryShareContextValue = {
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  isSelected: (sessionId: string) => boolean;
  toggleSelection: (sessionId: string) => void;
  clearSelection: () => void;
  cancelSelection: () => void;
  continueSelection: () => void;
  isSavingSelection: boolean;
  openLibraryDialog: () => void;
  openEditGallery: (gallery: SharedGallerySummary) => void;
  showTutorial: () => void;
};

const GALLERY_TOUR_STEPS: FeatureTourStep[] = [
  {
    selectors: [
      '[data-gallery-tour="sessions"]',
      '[data-gallery-tour="empty"]',
    ],
    title: "Photobooth session results",
    description:
      "Every completed session processed from the kiosk appears here. Open a card to view results and available actions.",
  },
  {
    selectors: ['[data-gallery-tour="shared-galleries"]'],
    title: "Share multiple sessions",
    description:
      "Shared galleries combine multiple sessions into a single public link that can be shared with clients or event organizers.",
  },
];

const GalleryShareContext = createContext<GalleryShareContextValue | null>(
  null,
);

export function GalleryShareProvider({
  initialSharedGalleries,
  children,
}: {
  initialSharedGalleries: SharedGallerySummary[];
  children: ReactNode;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [sharedGalleries, setSharedGalleries] = useState(
    initialSharedGalleries,
  );
  const [dialogMode, setDialogMode] = useState<"create" | "library" | null>(
    null,
  );
  const [editingGallery, setEditingGallery] = useState<SharedGallerySummary | null>(null);
  const [createdGallery, setCreatedGallery] =
    useState<SharedGallerySummary | null>(null);
  const [isSavingSelection, startSavingSelection] = useTransition();
  const galleryTutorial = useFeatureTutorial("gallery");

  const toggleSelection = useCallback((sessionId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  const cancelSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  }, []);
  const openCreateDialog = useCallback(() => {
    setCreatedGallery(null);
    setEditingGallery(null);
    setDialogMode("create");
  }, []);
  const openLibraryDialog = useCallback(() => setDialogMode("library"), []);
  const openEditGallery = useCallback((gallery: SharedGallerySummary) => {
    setEditingGallery(gallery);
    setSelectedIds(new Set(gallery.sessionIds));
    setIsSelectionMode(true);
    setDialogMode(null);
  }, []);
  const startSelection = useCallback(() => {
    setSelectedIds(new Set());
    setCreatedGallery(null);
    setEditingGallery(null);
    setIsSelectionMode(true);
    setDialogMode(null);
  }, []);
  const continueSelection = useCallback(() => {
    if (!editingGallery) {
      openCreateDialog();
      return;
    }

    const sessionIds = [...selectedIds];
    if (sessionIds.length === 0) return;

    startSavingSelection(async () => {
      try {
        const gallery = await updateSharedGallery({
          id: editingGallery.id,
          name: editingGallery.name,
          sessionIds,
        });
        setSharedGalleries((current) =>
          current.map((item) => (item.id === gallery.id ? gallery : item)),
        );
        setEditingGallery(null);
        setIsSelectionMode(false);
        setDialogMode(null);
        clearSelection();
        toast.success("Shared gallery updated.");
      } catch (error) {
        showErrorToast(
          "Shared gallery could not be updated",
          error,
          "Unable to update shared gallery.",
        );
      }
    });
  }, [clearSelection, editingGallery, openCreateDialog, selectedIds]);

  const value = useMemo<GalleryShareContextValue>(
    () => ({
      isSelectionMode,
      selectedIds,
      isSelected: (sessionId) => selectedIds.has(sessionId),
      toggleSelection,
      clearSelection,
      cancelSelection,
      continueSelection,
      isSavingSelection,
      openLibraryDialog,
      openEditGallery,
      showTutorial: galleryTutorial.show,
    }),
    [
      cancelSelection,
      clearSelection,
      continueSelection,
      isSelectionMode,
      isSavingSelection,
      openLibraryDialog,
      openEditGallery,
      selectedIds,
      toggleSelection,
      galleryTutorial.show,
    ],
  );

  return (
    <GalleryShareContext.Provider value={value}>
      {children}
      <SelectionToolbar />
      <CreateSharedGalleryDialog
        key={editingGallery?.id ?? "create"}
        open={dialogMode === "create"}
        onOpenChange={(open) => setDialogMode(open ? "create" : null)}
        selectedIds={[...selectedIds]}
        createdGallery={createdGallery}
        editingGallery={editingGallery}
        onCreated={(gallery) => {
          setCreatedGallery(gallery);
          setSharedGalleries((current) => [gallery, ...current]);
          setIsSelectionMode(false);
          clearSelection();
        }}
        onUpdated={(gallery) => {
          setSharedGalleries((current) =>
            current.map((item) => (item.id === gallery.id ? gallery : item)),
          );
          setEditingGallery(null);
          setIsSelectionMode(false);
          setDialogMode(null);
          clearSelection();
          toast.success("Shared gallery updated.");
        }}
      />
      <SharedGalleryLibraryDialog
        open={dialogMode === "library"}
        onOpenChange={(open) => setDialogMode(open ? "library" : null)}
        galleries={sharedGalleries}
        onCreate={startSelection}
        onEdit={openEditGallery}
        onDeleted={(galleryId) =>
          setSharedGalleries((current) =>
            current.filter((gallery) => gallery.id !== galleryId),
          )
        }
      />
      {galleryTutorial.open ? (
        <FeatureGuidedTour
          open
          title="Gallery guide"
          steps={GALLERY_TOUR_STEPS}
          onClose={galleryTutorial.complete}
          onComplete={galleryTutorial.complete}
        />
      ) : null}
    </GalleryShareContext.Provider>
  );
}

export function useGalleryShareSelection() {
  return useContext(GalleryShareContext);
}

export function GalleryShareHeaderActions() {
  const context = useGalleryShareSelection();
  if (!context) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={context.showTutorial}>
        <CircleHelp className="size-4" />
        Show tutorial
      </Button>
      <Button
        data-gallery-tour="shared-galleries"
        variant="outline"
        onClick={context.openLibraryDialog}
      >
        <FolderOpen className="size-4" />
        Shared galleries
      </Button>
    </div>
  );
}

export function GallerySelectionButton({ sessionId }: { sessionId: string }) {
  const context = useGalleryShareSelection();
  if (!context?.isSelectionMode) return null;
  const selected = context.isSelected(sessionId);

  return (
    <button
      type="button"
      aria-label={selected ? "Remove from selection" : "Select gallery session"}
      aria-pressed={selected}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        context.toggleSelection(sessionId);
      }}
      className={cn(
        "absolute top-2 left-2 z-10 grid size-8 place-items-center rounded-full border shadow-sm transition-colors",
        selected
          ? "border-[#00357B] bg-[#00357B] text-white"
          : "border-white/80 bg-white/90 text-transparent hover:text-zinc-500",
      )}
    >
      <Check className="size-4" />
    </button>
  );
}

function SelectionToolbar() {
  const context = useGalleryShareSelection();
  if (!context?.isSelectionMode) return null;

  return (
    <div className="fixed inset-x-3 bottom-4 z-40 mx-auto flex w-[calc(100%-1.5rem)] max-w-xl items-center gap-3 rounded-2xl border border-zinc-800 bg-[#00357B] p-2.5 text-white shadow-2xl sm:bottom-6 sm:p-3">
      <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
        <Images className="size-4 shrink-0" />
        <span className="truncate text-sm font-medium">
          {context.selectedIds.size} sessions selected
        </span>
      </div>
      <Button
        variant="ghost"
        className="text-zinc-300 hover:bg-white/10 hover:text-white"
        onClick={context.cancelSelection}
      >
        <X className="size-4" />
        Cancel
      </Button>
      <Button
        className="bg-white text-zinc-950 hover:bg-zinc-200"
        onClick={context.continueSelection}
        disabled={context.selectedIds.size === 0 || context.isSavingSelection}
      >
        {context.isSavingSelection ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Share2 className="size-4" />
        )}
        {context.isSavingSelection ? "Saving..." : "Continue"}
      </Button>
    </div>
  );
}

function CreateSharedGalleryDialog({
  open,
  onOpenChange,
  selectedIds,
  createdGallery,
  editingGallery,
  onCreated,
  onUpdated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  createdGallery: SharedGallerySummary | null;
  editingGallery: SharedGallerySummary | null;
  onCreated: (gallery: SharedGallerySummary) => void;
  onUpdated: (gallery: SharedGallerySummary) => void;
}) {
  const [name, setName] = useState(editingGallery?.name ?? "");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim()) {
      toast.error("Enter a gallery name.");
      return;
    }

    startTransition(async () => {
      try {
        const gallery = editingGallery
          ? await updateSharedGallery({ id: editingGallery.id, name, sessionIds: selectedIds })
          : await createSharedGallery({ name, sessionIds: selectedIds });
        if (editingGallery) onUpdated(gallery);
        else onCreated(gallery);
        setName("");
        if (!editingGallery) toast.success("Shared gallery created.");
      } catch (error) {
        showErrorToast(
          editingGallery
            ? "Shared gallery could not be updated"
            : "Shared gallery could not be created",
          error,
          editingGallery
            ? "Unable to update shared gallery."
            : "Unable to create shared gallery.",
        );
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        createdGallery ? "Gallery ready to share" : editingGallery ? "Edit shared gallery" : "Create shared gallery"
      }
      className="max-w-lg"
    >
      {createdGallery ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-semibold text-emerald-950">
              {createdGallery.name}
            </p>
            <p className="mt-1 text-sm text-emerald-800">
              {createdGallery.sessionCount} sessions are available from one
              public link.
            </p>
          </div>
          <ShareLinkField url={createdGallery.publicUrl} />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
            <Button
              onClick={() =>
                window.open(
                  createdGallery.publicUrl,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <ExternalLink className="size-4" />
              Open gallery
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="shared-gallery-name"
                className="text-sm font-medium text-zinc-800"
              >
                Gallery name
              </label>
              <Tooltip
                placement="left"
                label="Kumpulan galeri foto yang bisa dibagikan ke penyelenggara acara atau partner setelah sesi selesai."
              >
                <button
                  type="button"
                  aria-label="Tentang shared gallery"
                  className="grid size-6 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00357B]/30"
                >
                  <Info className="size-3.5" />
                </button>
              </Tooltip>
            </div>
            <Input
              id="shared-gallery-name"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder="Example: Car Free Day July"
              className="mt-2 h-11"
              autoFocus
            />
            <p className="mt-2 text-xs text-zinc-500">
              {selectedIds.length} selected sessions. Original files will not be
              copied.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={isPending || selectedIds.length === 0}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4" />
              )}
              {editingGallery ? "Save changes" : "Create gallery"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function SharedGalleryLibraryDialog({
  open,
  onOpenChange,
  galleries,
  onCreate,
  onEdit,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  galleries: SharedGallerySummary[];
  onCreate: () => void;
  onEdit: (gallery: SharedGallerySummary) => void;
  onDeleted: (galleryId: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const confirmDelete = useConfirmDialog();

  const remove = (gallery: SharedGallerySummary) => {
    confirmDelete.confirm({
      title: "Delete shared gallery?",
      description: `“${gallery.name}” will be removed. Original sessions and files will remain unchanged.`,
      confirmLabel: "Delete gallery",
      destructive: true,
      onConfirm: () => {
        setDeletingId(gallery.id);
        void deleteSharedGallery(gallery.id)
          .then(() => {
            onDeleted(gallery.id);
            toast.success(
              "Shared gallery deleted. Original files were not changed.",
            );
          })
          .catch((error) =>
            showErrorToast(
              "Shared gallery deletion failed",
              error,
              "The shared gallery could not be deleted. Please try again.",
            ),
          )
          .finally(() => setDeletingId(null));
      },
    });
  };

  return (
    <>
      {confirmDelete.dialog}
      <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Shared galleries"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 border-b border-zinc-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm leading-6 text-zinc-500">
            Create a public collection from selected gallery sessions without
            copying the original files.
          </p>
          <Button className="shrink-0" onClick={onCreate}>
            <Share2 className="size-4" />
            Create share gallery
          </Button>
        </div>

        {galleries.length === 0 ? (
          <div className="grid min-h-52 place-items-center rounded-xl border border-dashed border-zinc-200 p-8 text-center">
            <div>
              <FolderOpen className="mx-auto size-8 text-zinc-400" />
              <p className="mt-3 text-sm font-medium text-zinc-800">
                No shared galleries yet
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Use Create share gallery to select sessions from the gallery.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {galleries.map((gallery) => (
              <div
                key={gallery.id}
                className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-950">
                    {gallery.name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {gallery.sessionCount} sessions ·{" "}
                    {formatCreatedAt(gallery.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(gallery)}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyLink(gallery.publicUrl)}
                  >
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      window.open(
                        gallery.publicUrl,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                    aria-label={`Open ${gallery.name}`}
                  >
                    <ExternalLink className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    disabled={deletingId === gallery.id}
                    onClick={() => remove(gallery)}
                    aria-label={`Delete ${gallery.name}`}
                  >
                    {deletingId === gallery.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </Dialog>
    </>
  );
}

function ShareLinkField({ url }: { url: string }) {
  return (
    <div>
      <label
        htmlFor="shared-gallery-url"
        className="text-sm font-medium text-zinc-800"
      >
        Public link
      </label>
      <div className="mt-2 flex gap-2">
        <Input
          id="shared-gallery-url"
          value={url}
          readOnly
          className="h-10 min-w-0"
        />
        <Button variant="outline" onClick={() => copyLink(url)}>
          <Copy className="size-4" />
          Copy
        </Button>
      </div>
    </div>
  );
}

function copyLink(url: string) {
  void navigator.clipboard
    .writeText(url)
    .then(() => toast.success("Gallery link copied."))
    .catch(() => toast.error("Unable to copy the link."));
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
