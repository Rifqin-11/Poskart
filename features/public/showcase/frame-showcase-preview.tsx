import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FrameLayout, FrameNode } from "@/types/frame-template";

type FrameShowcasePreviewProps = {
  name: string;
  accentColor: string;
  frameImageUrl: string | null;
  frameLayout: FrameLayout | null;
  className?: string;
};

const PHOTO_BACKGROUNDS = [
  "linear-gradient(145deg,#dbeafe 0%,#f0f9ff 48%,#bbf7d0 49%,#86efac 100%)",
  "linear-gradient(145deg,#fee2e2 0%,#fef3c7 48%,#fed7aa 49%,#fb923c 100%)",
  "linear-gradient(145deg,#e9d5ff 0%,#f5f3ff 48%,#c4b5fd 49%,#818cf8 100%)",
  "linear-gradient(145deg,#cffafe 0%,#ecfeff 48%,#a7f3d0 49%,#34d399 100%)",
];

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function readObjectFit(value: unknown): "cover" | "contain" | "fill" {
  return value === "contain" || value === "fill" ? value : "cover";
}

function nodePosition(node: FrameNode, layout: FrameLayout) {
  const canvasWidth = Math.max(1, layout.canvas.width);
  const canvasHeight = Math.max(1, layout.canvas.height);

  return {
    left: `${(node.x / canvasWidth) * 100}%`,
    top: `${(node.y / canvasHeight) * 100}%`,
    width: `${(node.width / canvasWidth) * 100}%`,
    height: `${(node.height / canvasHeight) * 100}%`,
    opacity: node.opacity,
    transform: `rotate(${node.rotation}deg)`,
    zIndex: node.zIndex,
  };
}

function PreviewNode({
  node,
  layout,
  photoIndex,
}: {
  node: FrameNode;
  layout: FrameLayout;
  photoIndex: number;
}) {
  const position = nodePosition(node, layout);
  const radius = readNumber(node.props.radius, 0);

  if (node.type === "photo-slot") {
    return (
      <div
        aria-hidden="true"
        className="absolute overflow-hidden"
        style={{
          ...position,
          borderRadius: radius,
          background:
            PHOTO_BACKGROUNDS[photoIndex % PHOTO_BACKGROUNDS.length],
        }}
      >
        <div className="absolute left-[14%] top-[14%] h-[17%] w-[42%] rounded-full bg-white/75" />
        <div className="absolute bottom-[12%] right-[12%] size-[30%] rounded-full bg-white/25" />
      </div>
    );
  }

  if (node.type === "image" || node.type === "background") {
    const source = readString(node.props.src || node.props.url);
    const backgroundColor = readString(
      node.props.backgroundColor || node.props.color,
      "transparent",
    );

    return (
      <div
        aria-hidden="true"
        className="absolute overflow-hidden"
        style={{ ...position, borderRadius: radius, backgroundColor }}
      >
        {source ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={source}
            alt=""
            className="h-full w-full"
            style={{ objectFit: readObjectFit(node.props.objectFit) }}
          />
        ) : null}
      </div>
    );
  }

  if (node.type === "border") {
    return (
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          ...position,
          borderRadius: radius,
          borderColor: readString(node.props.borderColor, "#18181b"),
          borderStyle: "solid",
          borderWidth: readNumber(node.props.borderWidth, 1),
        }}
      />
    );
  }

  if (node.type === "text" || node.type === "date-stamp") {
    const content =
      node.type === "date-stamp"
        ? readString(node.props.content, "DD MMM YYYY")
        : readString(node.props.content);
    const fontSize = readNumber(node.props.fontSize, 18);
    const textAlign = readString(node.props.textAlign, "left");

    return (
      <div
        className="absolute flex overflow-hidden leading-tight"
        style={{
          ...position,
          alignItems: "center",
          justifyContent:
            textAlign === "center"
              ? "center"
              : textAlign === "right"
                ? "flex-end"
                : "flex-start",
          color: readString(node.props.color, "#18181b"),
          fontFamily: readString(node.props.fontFamily, "inherit"),
          fontSize: `${(fontSize / Math.max(1, layout.canvas.height)) * 100}cqh`,
          fontWeight: readNumber(node.props.fontWeight, 600),
          textAlign: textAlign === "center" || textAlign === "right" ? textAlign : "left",
          whiteSpace: readString(node.props.whiteSpace, "normal") as
            | "normal"
            | "nowrap",
        }}
      >
        {content}
      </div>
    );
  }

  return null;
}

export function FrameShowcasePreview({
  name,
  accentColor,
  frameImageUrl,
  frameLayout,
  className,
}: FrameShowcasePreviewProps) {
  const canvas = frameLayout?.canvas;
  const frameWidth = Math.max(1, canvas?.width ?? 420);
  const frameHeight = Math.max(1, canvas?.height ?? 630);
  const portrait = frameWidth <= frameHeight;
  let photoIndex = 0;

  return (
    <div className={cn("grid h-full w-full place-items-center", className)}>
      <div
        role="img"
        aria-label={`Preview frame ${name}`}
        className="relative isolate overflow-hidden bg-white shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
        style={{
          aspectRatio: `${frameWidth} / ${frameHeight}`,
          backgroundColor: canvas?.backgroundColor ?? `${accentColor}12`,
          containerType: "size",
          ...(portrait ? { height: "100%" } : { width: "100%" }),
        }}
      >
        {frameLayout?.nodes.length ? (
          frameLayout.nodes
            .slice()
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((node) => {
              const currentPhotoIndex = photoIndex;
              if (node.type === "photo-slot") photoIndex += 1;
              return (
                <PreviewNode
                  key={node.id}
                  node={node}
                  layout={frameLayout}
                  photoIndex={currentPhotoIndex}
                />
              );
            })
        ) : frameImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frameImageUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full place-items-center">
            <ImageIcon className="size-8 text-zinc-300" />
          </div>
        )}
      </div>
    </div>
  );
}
