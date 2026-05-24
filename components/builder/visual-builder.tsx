"use client";

import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  AlignCenter,
  Copy,
  Eye,
  EyeOff,
  Grid2X2,
  Lock,
  Monitor,
  Plus,
  Redo2,
  RotateCw,
  Smartphone,
  Trash2,
  Undo2,
  Unlock,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { useActiveLayoutSchema } from "@/hooks/use-admin-data";
import { adminService } from "@/lib/services/admin-service";
import { cn } from "@/lib/utils";
import { useBuilderStore } from "@/stores/builder-store";
import type { BuilderComponentType, BuilderNode, BuilderPage } from "@/types/builder";

const pageLabels: BuilderPage[] = ["landing", "camera", "preview", "thanks"];
const componentTypes: BuilderComponentType[] = [
  "text",
  "image",
  "button",
  "stamp",
  "qr",
  "receipt-preview",
  "frame-preview",
  "social-handle",
  "background-decoration",
];

function snap(value: number) {
  return Math.round(value / 8) * 8;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

function NodeRenderer({ node }: { node: BuilderNode }) {
  const color = readString(node.props.color, "#18181b");
  const fontSize = readNumber(node.props.fontSize, 18);

  if (node.type === "button") {
    return (
      <div
        className="grid h-full w-full place-items-center text-sm font-medium shadow-sm"
        style={{
          background: readString(node.props.background, "#18181b"),
          color: readString(node.props.color, "#ffffff"),
          borderRadius: readNumber(node.props.radius, 6),
        }}
      >
        {readString(node.props.label, "Button")}
      </div>
    );
  }

  if (node.type === "qr") {
    return (
      <div className="grid h-full w-full place-items-center rounded-md border border-zinc-300 bg-white p-3">
        <div className="grid size-full grid-cols-4 grid-rows-4 gap-1">
          {Array.from({ length: 16 }).map((_, index) => (
            <span key={index} className={cn("rounded-sm", index % 3 === 0 ? "bg-zinc-950" : "bg-zinc-200")} />
          ))}
        </div>
      </div>
    );
  }

  if (node.type === "receipt-preview") {
    return (
      <div className="h-full w-full rounded-sm border border-dashed border-zinc-300 bg-white p-5 font-mono text-zinc-950 shadow-xl">
        <div className="text-center text-sm font-bold">{readString(node.props.title, "POSKART")}</div>
        <div className="my-4 h-28 rounded bg-zinc-100" />
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span>DOUBLE PRINT</span><span>10K</span></div>
          <div className="flex justify-between"><span>QR DOWNLOAD</span><span>ON</span></div>
          <div className="border-t border-dashed pt-2 text-center">{readString(node.props.code, "PK-0000")}</div>
        </div>
      </div>
    );
  }

  if (node.type === "image" || node.type === "frame-preview" || node.type === "stamp" || node.type === "background-decoration") {
    return (
      <div className="grid h-full w-full place-items-center rounded-md border border-zinc-200 bg-zinc-100 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {node.type}
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full items-center"
      style={{ color, fontSize, fontWeight: readNumber(node.props.fontWeight, 500) }}
    >
      {readString(node.props.content, readString(node.props.label, node.type))}
    </div>
  );
}

function SortableLayer({ node }: { node: BuilderNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: node.id });
  const selectNode = useBuilderStore((state) => state.selectNode);
  const selectedId = useBuilderStore((state) => state.selectedId);
  const toggleNode = useBuilderStore((state) => state.toggleNode);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 py-2 text-xs",
        selectedId === node.id && "border-zinc-950",
      )}
    >
      <button className="cursor-grab text-zinc-400" {...attributes} {...listeners}>
        <Grid2X2 className="size-3" />
      </button>
      <button className="min-w-0 flex-1 text-left" onClick={() => selectNode(node.id)}>
        <div className="truncate font-medium">{node.type}</div>
        <div className="truncate text-zinc-500">{node.id}</div>
      </button>
      <button onClick={() => toggleNode(node.id, "visible")}>{node.visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}</button>
      <button onClick={() => toggleNode(node.id, "locked")}>{node.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}</button>
    </div>
  );
}

function PropertiesPanel({ selectedNode }: { selectedNode?: BuilderNode }) {
  const updateNode = useBuilderStore((state) => state.updateNode);
  const updateNodeProps = useBuilderStore((state) => state.updateNodeProps);
  const duplicateNode = useBuilderStore((state) => state.duplicateNode);
  const deleteNode = useBuilderStore((state) => state.deleteNode);

  if (!selectedNode) {
    return <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-sm text-zinc-500">Select a layer to edit position, typography, colors, radius, shadow, opacity, and rotation.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{selectedNode.type}</div>
          <div className="text-xs text-zinc-500">{selectedNode.id}</div>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => duplicateNode(selectedNode.id)}><Copy /></Button>
          <Button variant="ghost" size="icon" onClick={() => deleteNode(selectedNode.id)}><Trash2 /></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(["x", "y", "width", "height"] as const).map((key) => (
          <label key={key} className="text-xs font-medium text-zinc-500">
            {key.toUpperCase()}
            <Input
              className="mt-1"
              type="number"
              value={selectedNode[key]}
              onChange={(event) => updateNode(selectedNode.id, { [key]: Number(event.target.value) })}
            />
          </label>
        ))}
      </div>

      <label className="block text-xs font-medium text-zinc-500">
        Opacity
        <Slider
          min={0.1}
          max={1}
          step={0.05}
          value={selectedNode.opacity}
          onChange={(event) => updateNode(selectedNode.id, { opacity: Number(event.target.value) })}
        />
      </label>

      <label className="block text-xs font-medium text-zinc-500">
        Rotation
        <Input
          className="mt-1"
          type="number"
          value={selectedNode.rotation}
          onChange={(event) => updateNode(selectedNode.id, { rotation: Number(event.target.value) })}
        />
      </label>

      <label className="block text-xs font-medium text-zinc-500">
        Text / Label
        <Input
          className="mt-1"
          value={readString(selectedNode.props.content, readString(selectedNode.props.label, ""))}
          onChange={(event) =>
            updateNodeProps(
              selectedNode.id,
              selectedNode.type === "button" ? { label: event.target.value } : { content: event.target.value },
            )
          }
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-zinc-500">
          Color
          <Input
            className="mt-1"
            value={readString(selectedNode.props.color, "#18181b")}
            onChange={(event) => updateNodeProps(selectedNode.id, { color: event.target.value })}
          />
        </label>
        <label className="text-xs font-medium text-zinc-500">
          Radius
          <Input
            className="mt-1"
            type="number"
            value={readNumber(selectedNode.props.radius, 6)}
            onChange={(event) => updateNodeProps(selectedNode.id, { radius: Number(event.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}

export function VisualBuilder() {
  const sensors = useSensors(useSensor(PointerSensor));
  const activePage = useBuilderStore((state) => state.activePage);
  const setActivePage = useBuilderStore((state) => state.setActivePage);
  const selectedId = useBuilderStore((state) => state.selectedId);
  const selectNode = useBuilderStore((state) => state.selectNode);
  const nodes = useBuilderStore((state) => state.nodes);
  const updateNode = useBuilderStore((state) => state.updateNode);
  const addNode = useBuilderStore((state) => state.addNode);
  const undo = useBuilderStore((state) => state.undo);
  const redo = useBuilderStore((state) => state.redo);
  const reorderNodes = useBuilderStore((state) => state.reorderNodes);
  const schema = useBuilderStore((state) => state.schema);
  const setSchema = useBuilderStore((state) => state.setSchema);
  const { data: savedLayout } = useActiveLayoutSchema();
  const hydratedLayoutId = useRef<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const visibleNodes = nodes.filter((node) => node.page === activePage).sort((a, b) => a.zIndex - b.zIndex);
  const selectedNode = nodes.find((node) => node.id === selectedId);

  useEffect(() => {
    if (!savedLayout || hydratedLayoutId.current === savedLayout.id) return;
    setSchema(savedLayout.schema);
    hydratedLayoutId.current = savedLayout.id;
  }, [savedLayout, setSchema]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = visibleNodes.findIndex((node) => node.id === event.active.id);
    const newIndex = visibleNodes.findIndex((node) => node.id === event.over?.id);
    reorderNodes(arrayMove(visibleNodes, oldIndex, newIndex).map((node) => node.id));
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      await adminService.publishLayoutSchema(schema());
      toast.success("Layout schema published to Supabase");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to publish layout schema");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visual Layout Builder</h1>
          <p className="mt-1 text-sm text-zinc-500">Bounded photobooth canvas with live JSON schema output.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Tooltip label="Undo"><Button variant="outline" size="icon" onClick={undo}><Undo2 /></Button></Tooltip>
          <Tooltip label="Redo"><Button variant="outline" size="icon" onClick={redo}><Redo2 /></Button></Tooltip>
          <Button variant="outline"><Monitor className="size-4" /> Preview</Button>
          <Button onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? "Publishing..." : "Publish changes"}
          </Button>
        </div>
      </div>

      <div className="grid min-h-[760px] gap-4 xl:grid-cols-[260px_1fr_340px]">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold">Layers</div>
            <Badge variant="secondary">{visibleNodes.length}</Badge>
          </div>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={visibleNodes.map((node) => node.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {visibleNodes.map((node) => <SortableLayer key={node.id} node={node} />)}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-5 border-t border-zinc-100 pt-4">
            <div className="mb-2 text-xs font-medium text-zinc-500">Add component</div>
            <div className="grid grid-cols-2 gap-2">
              {componentTypes.map((type) => (
                <Button key={type} variant="outline" size="sm" onClick={() => addNode(type)}>
                  <Plus className="size-3" />
                  {type.split("-")[0]}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 p-3">
            <Tabs defaultValue={activePage} value={activePage} onValueChange={(value) => setActivePage(value as BuilderPage)}>
              <TabsList>
                {pageLabels.map((page) => <TabsTrigger key={page} value={page}>{page}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Smartphone className="size-4" />
              512 x 720
            </div>
          </div>

          <div className="builder-grid flex min-h-[700px] items-center justify-center bg-zinc-100 p-8" onClick={() => selectNode(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative h-[720px] w-[512px] overflow-hidden rounded-[28px] border-[10px] border-zinc-950 bg-white shadow-2xl"
            >
              <div className="absolute left-1/2 top-3 h-1 w-20 -translate-x-1/2 rounded-full bg-zinc-200" />
              {visibleNodes.map((node) =>
                node.visible ? (
                  <Rnd
                    key={node.id}
                    bounds="parent"
                    disableDragging={node.locked}
                    enableResizing={!node.locked}
                    position={{ x: node.x, y: node.y }}
                    size={{ width: node.width, height: node.height }}
                    onClick={(event: React.MouseEvent) => {
                      event.stopPropagation();
                      selectNode(node.id);
                    }}
                    onDragStop={(_, data) => updateNode(node.id, { x: snap(data.x), y: snap(data.y) })}
                    onResizeStop={(_, __, ref, ___, position) =>
                      updateNode(node.id, {
                        width: snap(ref.offsetWidth),
                        height: snap(ref.offsetHeight),
                        x: snap(position.x),
                        y: snap(position.y),
                      })
                    }
                    style={{
                      zIndex: node.zIndex,
                      opacity: node.opacity,
                      transform: `rotate(${node.rotation}deg)`,
                    }}
                    className={cn(
                      "group",
                      selectedId === node.id && "outline outline-2 outline-offset-2 outline-zinc-950",
                      node.locked && "cursor-not-allowed",
                    )}
                  >
                    <NodeRenderer node={node} />
                  </Rnd>
                ) : null,
              )}
            </motion.div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Properties</div>
              <div className="text-xs text-zinc-500">Position, style, and live schema.</div>
            </div>
            <AlignCenter className="size-4 text-zinc-400" />
          </div>
          <ScrollArea className="max-h-[690px] pr-2">
            <PropertiesPanel selectedNode={selectedNode} />
            <div className="mt-5 space-y-2 border-t border-zinc-100 pt-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Schema</div>
                <RotateCw className="size-4 text-zinc-400" />
              </div>
              <Select defaultValue="portrait">
                <option value="portrait">Portrait tablet</option>
                <option value="landscape">Landscape preview</option>
              </Select>
              <pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-100">
                {JSON.stringify(schema(), null, 2)}
              </pre>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
