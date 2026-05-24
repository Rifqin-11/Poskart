export type ThemeSchema = {
  version: 1;
  colors: Record<string, string>;
  typography: Record<string, string>;
  radius: Record<string, number>;
  shadows: Record<string, string>;
  assets: { logoUrl?: string; textureUrl?: string };
  animationPreset: "none" | "subtle" | "playful" | "premium";
};

export type ThemePreset = {
  id: string;
  name: string;
  status: "draft" | "published";
  schema: ThemeSchema;
};
