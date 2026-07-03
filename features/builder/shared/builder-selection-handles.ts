import type { CSSProperties } from "react";
import type { HandleClasses, HandleStyles } from "react-rnd";

const selectionColor = "#cbd5e1";
const selectionShadow = "0 2px 8px rgba(15, 23, 42, 0.18)";
const resizeHandleClassName = "builder-resize-handle";

const cornerHandle: CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 9999,
  border: "2px solid #a1a1aa",
  background: "#ffffff",
  boxShadow: selectionShadow,
  transition:
    "background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
  zIndex: 30,
};

const sideHandle: CSSProperties = {
  border: "2px solid #a1a1aa",
  background: "#ffffff",
  boxShadow: selectionShadow,
  transition:
    "background-color 120ms ease, border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
  zIndex: 30,
};

export const builderSelectedResizeHandleStyles: HandleStyles = {
  topLeft: {
    ...cornerHandle,
    top: -12,
    left: -12,
  },
  topRight: {
    ...cornerHandle,
    top: -12,
    right: -12,
  },
  bottomLeft: {
    ...cornerHandle,
    bottom: -12,
    left: -12,
  },
  bottomRight: {
    ...cornerHandle,
    right: -12,
    bottom: -12,
  },
  top: {
    ...sideHandle,
    top: -7,
    left: "50%",
    width: 38,
    height: 14,
    borderRadius: 9999,
    transform: "translateX(-50%)",
  },
  bottom: {
    ...sideHandle,
    bottom: -7,
    left: "50%",
    width: 38,
    height: 14,
    borderRadius: 9999,
    transform: "translateX(-50%)",
  },
  left: {
    ...sideHandle,
    left: -7,
    top: "50%",
    width: 14,
    height: 38,
    borderRadius: 9999,
    transform: "translateY(-50%)",
  },
  right: {
    ...sideHandle,
    right: -7,
    top: "50%",
    width: 14,
    height: 38,
    borderRadius: 9999,
    transform: "translateY(-50%)",
  },
};

export const builderHiddenResizeHandleStyles: HandleStyles = {
  top: { opacity: 0 },
  right: { opacity: 0 },
  bottom: { opacity: 0 },
  left: { opacity: 0 },
  topLeft: { opacity: 0 },
  topRight: { opacity: 0 },
  bottomLeft: { opacity: 0 },
  bottomRight: { opacity: 0 },
};

export const builderResizeHandleClasses: HandleClasses = {
  top: resizeHandleClassName,
  right: resizeHandleClassName,
  bottom: resizeHandleClassName,
  left: resizeHandleClassName,
  topLeft: resizeHandleClassName,
  topRight: resizeHandleClassName,
  bottomLeft: resizeHandleClassName,
  bottomRight: resizeHandleClassName,
};

export const builderResizeHandleWrapperStyle: CSSProperties = {
  zIndex: 40,
};

export function getBuilderResizeHandleStyles(isSelected: boolean) {
  return isSelected
    ? builderSelectedResizeHandleStyles
    : builderHiddenResizeHandleStyles;
}

export const builderSelectionOutlineStyle: CSSProperties = {
  boxShadow: `0 0 0 3px ${selectionColor}`,
};
