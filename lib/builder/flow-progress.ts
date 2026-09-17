import type { BuilderPage, LayoutSchema } from "@/types/builder";

export const DEFAULT_FLOW_PAGES: BuilderPage[] = [
  "landing",
  "template",
  "camera",
  "preview",
  "thanks",
];

export function orderedFlowPages(schema: Pick<LayoutSchema, "canvas">) {
  const enabled = schema.canvas.enabledPages;
  if (!enabled) return DEFAULT_FLOW_PAGES;

  const enabledSet = new Set(enabled);
  enabledSet.add("landing");
  return DEFAULT_FLOW_PAGES.filter((page) => enabledSet.has(page));
}

export function flowProgressForPage(
  schema: Pick<LayoutSchema, "canvas">,
  page: BuilderPage,
) {
  const pages = orderedFlowPages(schema);
  const index = pages.indexOf(page);
  return {
    current: index >= 0 ? index + 1 : 0,
    total: pages.length,
  };
}
