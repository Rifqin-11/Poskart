import type { BuilderNode } from "@/types/builder";

export const COMPONENT_STYLE_PRESETS = [
  "default",
  "minimal",
  "glass",
  "retro",
  "playful",
] as const;

export type ComponentStylePreset = (typeof COMPONENT_STYLE_PRESETS)[number];

export const COMPONENT_STYLE_PRESET_OPTIONS: {
  value: ComponentStylePreset;
  label: string;
  description: string;
}[] = [
  { value: "default", label: "Default", description: "Gaya bawaan POSKART" },
  { value: "minimal", label: "Minimal", description: "Ringan dan bersih" },
  { value: "glass", label: "Glass", description: "Transparan dengan depth" },
  { value: "retro", label: "Retro", description: "Kontras dan monospace" },
  { value: "playful", label: "Playful", description: "Bulat dan ekspresif" },
];

export function readComponentStylePreset(
  props: Record<string, unknown>,
): ComponentStylePreset {
  const value = props.stylePreset;
  return typeof value === "string" && COMPONENT_STYLE_PRESETS.includes(value as ComponentStylePreset)
    ? (value as ComponentStylePreset)
    : "default";
}

export type ComponentStyleTokens = {
  surfaceColor: string;
  surfaceOpacity: number;
  borderColor: string;
  borderOpacity: number;
  borderWidth: number;
  radius: number;
  shadowColor: string;
  shadowOpacity: number;
  shadowBlur: number;
  shadowY: number;
  paddingX: number;
  paddingY: number;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  letterSpacing: number;
  progressColor: string;
  trackOpacity: number;
  progressHeight: number;
};

const BASE: ComponentStyleTokens = {
  surfaceColor: "#000000",
  surfaceOpacity: 0,
  borderColor: "#000000",
  borderOpacity: 0,
  borderWidth: 0,
  radius: 0,
  shadowColor: "#000000",
  shadowOpacity: 0,
  shadowBlur: 0,
  shadowY: 0,
  paddingX: 0,
  paddingY: 0,
  textColor: "#ffffff",
  fontFamily: "Manrope",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: 0,
  progressColor: "#27272A",
  trackOpacity: 0.2,
  progressHeight: 7,
};

const PRESET_TOKENS: Record<Exclude<ComponentStylePreset, "default">, Partial<ComponentStyleTokens>> = {
  minimal: {
    borderColor: "#FFFFFF",
    borderOpacity: 0.48,
    borderWidth: 1,
    radius: 8,
    paddingX: 10,
    paddingY: 7,
    fontFamily: "Manrope",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.1,
    progressHeight: 4,
  },
  glass: {
    surfaceColor: "#FFFFFF",
    surfaceOpacity: 0.18,
    borderColor: "#FFFFFF",
    borderOpacity: 0.38,
    borderWidth: 1,
    radius: 999,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowBlur: 18,
    shadowY: 6,
    paddingX: 14,
    paddingY: 9,
    fontFamily: "Manrope",
    fontSize: 13,
    fontWeight: 700,
    progressHeight: 6,
  },
  retro: {
    surfaceColor: "#F2E7C9",
    surfaceOpacity: 1,
    borderColor: "#27211A",
    borderOpacity: 1,
    borderWidth: 2,
    radius: 3,
    shadowColor: "#27211A",
    shadowOpacity: 0.9,
    shadowBlur: 0,
    shadowY: 4,
    paddingX: 12,
    paddingY: 8,
    textColor: "#27211A",
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.8,
    progressColor: "#C24B36",
    trackOpacity: 0.18,
    progressHeight: 6,
  },
  playful: {
    surfaceColor: "#F7C948",
    surfaceOpacity: 1,
    borderColor: "#27211A",
    borderOpacity: 1,
    borderWidth: 2,
    radius: 18,
    shadowColor: "#27211A",
    shadowOpacity: 0.8,
    shadowBlur: 0,
    shadowY: 4,
    paddingX: 14,
    paddingY: 9,
    textColor: "#27211A",
    fontFamily: "Manrope",
    fontSize: 13,
    fontWeight: 800,
    progressColor: "#E45B3F",
    trackOpacity: 0.2,
    progressHeight: 8,
  },
};

export function getComponentStyleTokens(
  node: Pick<BuilderNode, "type" | "props">,
): ComponentStyleTokens {
  const preset = readComponentStylePreset(node.props);
  const tokens = {
    ...BASE,
    ...(preset === "default" ? {} : PRESET_TOKENS[preset]),
  };

  if (node.type === "return-countdown") {
    tokens.textColor = readString(node.props.textColor, tokens.textColor);
    tokens.progressColor = readString(node.props.progressColor, tokens.progressColor);
  } else {
    tokens.textColor = readString(node.props.color, tokens.textColor);
  }
  tokens.surfaceColor = readString(
    node.props.presetBackgroundColor,
    tokens.surfaceColor,
  );
  tokens.surfaceOpacity = readNumber(
    node.props.presetBackgroundOpacity,
    tokens.surfaceOpacity,
  );
  tokens.fontFamily = readString(
    node.props.fontFamily,
    preset === "default" ? "inherit" : tokens.fontFamily,
  );
  tokens.fontSize = readNumber(node.props.fontSize, tokens.fontSize);
  tokens.fontWeight = readNumber(node.props.fontWeight, tokens.fontWeight);
  tokens.letterSpacing = readNumber(node.props.letterSpacing, tokens.letterSpacing);

  if (preset === "default" && node.type === "camera-timer") tokens.fontSize = 11;
  if (preset === "default" && node.type === "camera-flash") tokens.fontSize = 11;
  return tokens;
}

export function getPresetPropUpdates(
  node: Pick<BuilderNode, "type">,
  preset: ComponentStylePreset,
): Record<string, unknown> {
  const tokens = {
    ...BASE,
    ...(preset === "default" ? {} : PRESET_TOKENS[preset]),
  };
  if (node.type === "return-countdown") {
    return {
      stylePreset: preset,
      presetBackgroundColor:
        preset === "default" ? undefined : tokens.surfaceColor,
      presetBackgroundOpacity:
        preset === "default" ? undefined : tokens.surfaceOpacity,
      textColor: preset === "default" ? "#000000" : tokens.textColor,
      progressColor: preset === "default" ? "#27272A" : tokens.progressColor,
      fontFamily: tokens.fontFamily,
      fontSize: tokens.fontSize,
      fontWeight: tokens.fontWeight,
      letterSpacing: tokens.letterSpacing,
    };
  }
  return {
    stylePreset: preset,
    presetBackgroundColor:
      preset === "default" ? undefined : tokens.surfaceColor,
    presetBackgroundOpacity:
      preset === "default" ? undefined : tokens.surfaceOpacity,
    color: tokens.textColor,
    fontFamily: tokens.fontFamily,
    fontSize:
      preset === "default"
        ? node.type === "camera-shot-counter"
          ? 14
          : 11
        : tokens.fontSize,
    fontWeight: node.type === "camera-shot-counter" && preset === "default" ? 800 : tokens.fontWeight,
    letterSpacing: node.type === "camera-shot-counter" && preset === "default" ? 1 : tokens.letterSpacing,
  };
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
