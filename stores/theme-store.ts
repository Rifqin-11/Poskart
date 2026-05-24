"use client";

import { create } from "zustand";
import type { ThemeSchema } from "@/types/theme";

const defaultThemeSchema: ThemeSchema = {
  version: 1,
  colors: { background: "#ffffff", foreground: "#18181b", accent: "#ef4444", muted: "#f4f4f5" },
  typography: { heading: "Geist", body: "Geist", receipt: "Geist Mono" },
  radius: { card: 8, button: 6, receipt: 2 },
  shadows: { card: "0 12px 35px rgba(24,24,27,0.08)" },
  assets: {},
  animationPreset: "premium",
};

type ThemeState = {
  schema: ThemeSchema;
  published: boolean;
  setSchema: (schema: ThemeSchema) => void;
  setColor: (key: string, value: string) => void;
  setRadius: (key: string, value: number) => void;
  setAnimationPreset: (value: ThemeSchema["animationPreset"]) => void;
  publish: () => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  schema: defaultThemeSchema,
  published: false,
  setSchema: (schema) => set({ schema, published: false }),
  setColor: (key, value) =>
    set((state) => ({
      schema: { ...state.schema, colors: { ...state.schema.colors, [key]: value } },
      published: false,
    })),
  setRadius: (key, value) =>
    set((state) => ({
      schema: { ...state.schema, radius: { ...state.schema.radius, [key]: value } },
      published: false,
    })),
  setAnimationPreset: (value) =>
    set((state) => ({ schema: { ...state.schema, animationPreset: value }, published: false })),
  publish: () => set({ published: true }),
}));
