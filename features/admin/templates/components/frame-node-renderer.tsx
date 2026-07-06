"use client";

import { ColorKeyImage } from "@/features/builder/components/color-key-image";
import { readNumber, readString } from "@/features/admin/templates/frame-builder.utils";
import type { FrameNode } from "@/types/frame-template";

export function FrameNodeRenderer({ node }: { node: FrameNode }) {
  if (node.type === "photo-slot") {
    const photoOrder = readNumber(node.props.photoOrder, 0);
    return (
      <div
        className="grid h-full w-full place-items-center border-2 border-dashed text-center text-xs font-medium text-zinc-500"
        style={{
          background: readString(node.props.background, "#f4f4f5"),
          borderColor: readString(node.props.borderColor, "#d4d4d8"),
          borderRadius: readNumber(node.props.radius, 10),
        }}
      >
        {readString(
          node.props.label,
          photoOrder > 0 ? `Photo ${photoOrder}` : "Photo",
        )}
      </div>
    );
  }

  if (node.type === "image" || node.type === "background") {
    const src = readString(node.props.src, "");
    const fit = readString(node.props.objectFit, "cover");
    if (src) {
      return (
        <ColorKeyImage
          src={src}
          fit={fit}
          radius={readNumber(node.props.radius, 8)}
          colorKey={node.props.colorKey}
          className="h-full w-full bg-center bg-no-repeat"
        />
      );
    }

    return (
      <div className="grid h-full w-full place-items-center rounded-md border border-dashed border-zinc-300 bg-zinc-100 text-xs font-medium text-zinc-500">
        {node.type}
      </div>
    );
  }

  if (node.type === "border") {
    return (
      <div
        className="h-full w-full"
        style={{
          border: `${readNumber(node.props.borderWidth, 2)}px solid ${readString(node.props.borderColor, "#18181b")}`,
          borderRadius: readNumber(node.props.radius, 18),
        }}
      />
    );
  }

  return (
    <div
      className="flex h-full w-full items-center"
      style={{
        color: readString(node.props.color, "#18181b"),
        fontSize: readNumber(node.props.fontSize, 18),
        fontWeight: readNumber(node.props.fontWeight, 600),
      }}
    >
      {readString(
        node.props.content,
        node.type === "date-stamp" ? "DD.MM.YYYY" : "Text",
      )}
    </div>
  );
}
