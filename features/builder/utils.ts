import type { BuilderNode } from "@/types/builder";

export function snap(value: number) {
  return Math.round(value / 8) * 8;
}

export function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

export function isMediaNode(node: BuilderNode) {
  return (
    node.type === "image" ||
    node.type === "frame-preview" ||
    node.type === "background-decoration"
  );
}

export function isEditableTextNode(node: BuilderNode) {
  return (
    node.type === "text" ||
    node.type === "button" ||
    node.type === "social-handle"
  );
}
