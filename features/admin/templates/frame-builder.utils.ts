import {
  DEFAULT_FRAME_CANVAS,
  type FrameLayout,
  type FrameNode,
  type FrameNodeType,
} from "@/types/frame-template";

export function clampZoom(value: number) {
  return Math.min(2, Math.max(0.02, Number(value.toFixed(2))));
}

export function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

export function normalizeFrameLayout(layout: FrameLayout): FrameLayout {
  return layout;
}

export function resizeFrameLayout(
  layout: FrameLayout,
  width: number,
  height: number,
): FrameLayout {
  const nextWidth = Math.max(1, Math.round(width));
  const nextHeight = Math.max(1, Math.round(height));
  const scaleX = nextWidth / Math.max(1, layout.canvas.width);
  const scaleY = nextHeight / Math.max(1, layout.canvas.height);

  return {
    ...layout,
    canvas: {
      ...layout.canvas,
      width: nextWidth,
      height: nextHeight,
    },
    nodes: layout.nodes.map((node) =>
      node.id === "frame-background"
        ? {
            ...node,
            x: 0,
            y: 0,
            width: nextWidth,
            height: nextHeight,
          }
        : {
            ...node,
            x: Math.round(node.x * scaleX),
            y: Math.round(node.y * scaleY),
            width: Math.max(1, Math.round(node.width * scaleX)),
            height: Math.max(1, Math.round(node.height * scaleY)),
          },
    ),
  };
}

export function upsertFrameBackground(
  layout: FrameLayout,
  frameImageUrl?: string,
): FrameLayout {
  const src = frameImageUrl?.trim();
  const frameBackgroundId = "frame-background";

  if (!src) {
    return {
      ...layout,
      nodes: layout.nodes.filter((node) => node.id !== frameBackgroundId),
    };
  }

  const backgroundNode: FrameNode = {
    id: frameBackgroundId,
    type: "background",
    x: 0,
    y: 0,
    width: layout.canvas.width,
    height: layout.canvas.height,
    rotation: 0,
    opacity: 1,
    zIndex: 0,
    locked: true,
    props: { src, alt: "Frame background", objectFit: "cover", radius: 0 },
  };

  const hasBackground = layout.nodes.some(
    (node) => node.id === frameBackgroundId,
  );

  return {
    ...layout,
    nodes: hasBackground
      ? layout.nodes.map((node) =>
          node.id === frameBackgroundId
            ? {
                ...node,
                x: 0,
                y: 0,
                width: layout.canvas.width,
                height: layout.canvas.height,
                locked: true,
                props: {
                  ...node.props,
                  src,
                  alt: "Frame background",
                  objectFit: "cover",
                  radius: 0,
                },
              }
            : node,
        )
      : [backgroundNode, ...layout.nodes],
  };
}

export function createDefaultFrameLayout({
  frameImageUrl,
}: {
  frameImageUrl?: string;
}): FrameLayout {
  const canvas = { ...DEFAULT_FRAME_CANVAS };
  const nodes: FrameNode[] = [];

  if (frameImageUrl) {
    nodes.unshift({
      id: "frame-background",
      type: "background",
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      rotation: 0,
      opacity: 1,
      zIndex: 0,
      locked: true,
      props: { src: frameImageUrl, objectFit: "cover", radius: 0 },
    });
  }

  return { version: 1, canvas, nodes };
}

export function createNode(type: FrameNodeType, layout: FrameLayout): FrameNode {
  const zIndex = Math.max(0, ...layout.nodes.map((node) => node.zIndex)) + 1;
  const base = {
    id: `${type}-${Date.now()}`,
    type,
    x: 48,
    y: 88,
    width: type === "text" || type === "date-stamp" ? 180 : 132,
    height: type === "text" || type === "date-stamp" ? 40 : 132,
    rotation: 0,
    opacity: 1,
    zIndex,
    locked: false,
  };

  if (type === "photo-slot") {
    return {
      ...base,
      width: 160,
      height: 210,
      props: {
        label: "Photo",
        background: "#f4f4f5",
        borderColor: "#d4d4d8",
        radius: 10,
      },
    };
  }

  if (type === "image" || type === "background") {
    return {
      ...base,
      props: {
        src: "",
        alt: type,
        objectFit: "cover",
        radius: type === "background" ? 0 : 8,
      },
    };
  }

  if (type === "border") {
    return {
      ...base,
      width: 260,
      height: 360,
      props: { borderColor: "#18181b", borderWidth: 2, radius: 18 },
    };
  }

  return {
    ...base,
    props: {
      content: type === "date-stamp" ? "DD.MM.YYYY" : "Text",
      color: "#18181b",
      fontSize: 18,
      fontWeight: 600,
    },
  };
}

export function normalizePhotoSlotLabels(nodes: FrameNode[]): FrameNode[] {
  const photoSlots = nodes.filter((node) => node.type === "photo-slot");
  const slotIdToIndex = new Map(
    photoSlots.map((node, index) => [node.id, index]),
  );

  return nodes.map((node) => {
    if (node.type !== "photo-slot") return node;
    const index = slotIdToIndex.get(node.id);
    if (index === undefined) return node;
    return {
      ...node,
      props: {
        ...node.props,
        label: `Photo ${index + 1}`,
      },
    };
  });
}

export function clampNumber(value: number, min: number, max: number) {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

export function getRotatedVisualInset(
  width: number,
  height: number,
  rotation: number,
) {
  const radians = ((rotation % 360) * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rotatedWidth = Math.abs(width * cos) + Math.abs(height * sin);
  const rotatedHeight = Math.abs(width * sin) + Math.abs(height * cos);

  return {
    x: Math.max(0, (rotatedWidth - width) / 2),
    y: Math.max(0, (rotatedHeight - height) / 2),
  };
}
