import { readNumber, readString } from "@/features/builder/utils";
import type { BuilderNode } from "@/types/builder";

export function sanitizeSvgMarkup(markup: string): string {
  if (!markup.trim().startsWith("<svg")) return "";

  return markup
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject\s*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s+(?:href|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi,
      "",
    );
}

export function calculatePhotoResultGrid(node: BuilderNode) {
  const count = Math.max(
    1,
    Math.min(12, Math.round(readNumber(node.props.samplePhotoCount, 4))),
  );
  const mode = readString(node.props.photoLayout, "auto");
  const manualColumns = Math.round(readNumber(node.props.photoColumns, 0));
  let columns: number;

  if (manualColumns > 0) {
    columns = manualColumns;
  } else if (mode === "row") {
    columns = count;
  } else if (mode === "column") {
    columns = 1;
  } else if (mode === "grid") {
    columns = Math.ceil(Math.sqrt(count));
  } else {
    const aspect = node.height > 0 ? node.width / node.height : 1;
    if (aspect >= 1.75) {
      columns = count;
    } else if (aspect <= 0.6) {
      columns = 1;
    } else {
      columns = Math.ceil(Math.sqrt(count));
    }
  }

  columns = Math.max(1, Math.min(count, columns));
  const rows = Math.ceil(count / columns);
  return {
    count,
    columns,
    rows,
    label: `${rows}×${columns}`,
    modeLabel: mode === "auto" && manualColumns <= 0 ? "Auto" : "Manual",
  };
}

export function calculateTemplateGrid(node: BuilderNode) {
  const count = Math.max(
    1,
    Math.min(24, Math.round(readNumber(node.props.tileCount, 4))),
  );
  const mode = readString(node.props.templateLayout, "auto");
  const manualColumns = Math.round(readNumber(node.props.templateColumns, 0));
  let columns: number;

  if (manualColumns > 0) {
    columns = manualColumns;
  } else if (mode === "row") {
    columns = count;
  } else if (mode === "column") {
    columns = 1;
  } else if (mode === "grid") {
    columns = Math.ceil(Math.sqrt(count));
  } else {
    const minTileWidth = Math.max(80, readNumber(node.props.minTileWidth, 280));
    const gap = Math.max(0, readNumber(node.props.templateGap, 8));
    columns = Math.floor((node.width + gap) / (minTileWidth + gap));
  }

  columns = Math.max(1, Math.min(count, columns));
  const rows = Math.ceil(count / columns);
  return {
    count,
    columns,
    rows,
    gap: Math.max(0, readNumber(node.props.templateGap, 8)),
    label: `${rows}×${columns}`,
    modeLabel: mode === "auto" && manualColumns <= 0 ? "Auto" : "Manual",
  };
}
