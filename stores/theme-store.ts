"use client";

import { create } from "zustand";
import { themePresets } from "@/lib/mock-data/admin-data";
import type { ThemeSchema } from "@/types/theme";

type ThemeState = {
  schema: ThemeSchema;
  published: boolean;
  setColor: (key: string, value: string) => void;
  setRadius: (key: string, value: number) => void;
  setAnimationPreset: (value: ThemeSchema["animationPreset"]) => void;
  publish: () => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  schema: themePresets[0].schema,
  published: false,
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
