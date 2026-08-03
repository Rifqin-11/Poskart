"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  TIMESTAMP_PART_OPTIONS,
  previewTimestamp,
} from "@/features/admin/templates/frame-builder.utils";
import { cn } from "@/lib/utils";
import type { TimestampPart } from "@/types/frame-template";

type TimestampFormatEditorProps = {
  parts: TimestampPart[];
  separator: string;
  onChangeParts: (parts: TimestampPart[]) => void;
  onChangeSeparator: (separator: string) => void;
};

function SortableTimestampPart({
  part,
  canRemove,
  onRemove,
}: {
  part: TimestampPart;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const option = TIMESTAMP_PART_OPTIONS.find((item) => item.value === part);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: part });

  if (!option) return null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm transition-colors",
        isDragging && "relative z-10 border-[#00357B]/30 shadow-md",
      )}
    >
      <button
        type="button"
        className="flex size-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 active:cursor-grabbing"
        aria-label={`Pindahkan ${option.label}`}
        title="Drag untuk mengubah urutan"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-zinc-800">
          {option.label}
        </div>
        <div className="text-[11px] tabular-nums text-zinc-400">
          Contoh: {option.example}
        </div>
      </div>
      <button
        type="button"
        disabled={!canRemove}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
        aria-label={`Hapus ${option.label}`}
        title={
          canRemove ? "Hapus dari timestamp" : "Minimal satu bagian harus aktif"
        }
        onClick={onRemove}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export function TimestampFormatEditor({
  parts,
  separator,
  onChangeParts,
  onChangeSeparator,
}: TimestampFormatEditorProps) {
  const validParts = useMemo(() => {
    const allowed = new Set(TIMESTAMP_PART_OPTIONS.map((item) => item.value));
    const uniqueParts = parts.filter(
      (part, index) => allowed.has(part) && parts.indexOf(part) === index,
    );
    return uniqueParts.length > 0
      ? uniqueParts
      : (["date", "month", "year"] as TimestampPart[]);
  }, [parts]);
  const availableParts = TIMESTAMP_PART_OPTIONS.filter(
    (option) => !validParts.includes(option.value),
  );
  const [partToAdd, setPartToAdd] = useState<TimestampPart | "">(
    availableParts[0]?.value ?? "",
  );
  const selectedPartToAdd = availableParts.some(
    (item) => item.value === partToAdd,
  )
    ? partToAdd
    : (availableParts[0]?.value ?? "");
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 160, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = validParts.indexOf(active.id as TimestampPart);
    const newIndex = validParts.indexOf(over.id as TimestampPart);
    if (oldIndex < 0 || newIndex < 0) return;
    onChangeParts(arrayMove(validParts, oldIndex, newIndex));
  };

  const handleAdd = () => {
    if (!selectedPartToAdd || validParts.includes(selectedPartToAdd)) return;
    onChangeParts([...validParts, selectedPartToAdd]);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 p-3">
      <div>
        <div className="text-xs font-semibold text-zinc-800">
          Susunan timestamp
        </div>
        <p className="mt-0.5 text-[11px] leading-4 text-zinc-500">
          Drag bagian untuk mengubah urutan. Spasi antara tanggal, waktu, dan
          hari ditambahkan otomatis.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={validParts}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1.5">
            {validParts.map((part) => (
              <SortableTimestampPart
                key={part}
                part={part}
                canRemove={validParts.length > 1}
                onRemove={() =>
                  onChangeParts(validParts.filter((item) => item !== part))
                }
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {availableParts.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Select
            value={selectedPartToAdd}
            aria-label="Pilih bagian timestamp"
            onChange={(event) =>
              setPartToAdd(event.target.value as TimestampPart)
            }
          >
            {availableParts.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={!selectedPartToAdd}
            onClick={handleAdd}
          >
            <Plus className="size-4" />
            Tambah
          </Button>
        </div>
      ) : (
        <p className="text-[11px] text-zinc-400">
          Semua bagian timestamp sudah ditambahkan.
        </p>
      )}

      <label className="block text-xs font-medium text-zinc-600">
        Pemisah dalam grup
        <Input
          className="mt-1 bg-white"
          value={separator}
          maxLength={3}
          placeholder="."
          onChange={(event) => onChangeSeparator(event.target.value)}
        />
        <span className="mt-1 block text-[11px] font-normal leading-4 text-zinc-400">
          Dipakai di antara DD, MM, YYYY serta HH, mm, ss.
        </span>
      </label>

      <div className="rounded-xl border border-[#00357B]/15 bg-[#00357B]/5 px-3 py-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#00357B]/60">
          Preview
        </div>
        <div className="mt-1 break-words text-sm font-semibold tabular-nums text-[#00357B]">
          {previewTimestamp(validParts, separator)}
        </div>
      </div>
    </div>
  );
}
