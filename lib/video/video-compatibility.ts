export type VideoProbeStream = {
  codec_name?: string;
  profile?: string;
  level?: number;
  pix_fmt?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
};

export type VideoProbeResult = {
  streams?: VideoProbeStream[];
  format?: {
    duration?: string | number;
  };
};

export type VideoCompatibility = {
  stream: VideoProbeStream;
  width: number;
  height: number;
  framesPerSecond: number;
  durationSeconds: number | null;
  requiresTranscode: boolean;
  reasons: string[];
};

const ANDROID_SAFE_H264_PROFILES = new Set([
  "baseline",
  "constrained baseline",
  "main",
  "high",
]);

const MAX_H264_LEVEL = 41;
const MAX_FRAMES_PER_SECOND = 30;
const LANDSCAPE_MAX_WIDTH = 1600;
const LANDSCAPE_MAX_HEIGHT = 1000;

export function parseFrameRate(value?: string) {
  if (!value) return 0;
  const [rawNumerator, rawDenominator = "1"] = value.split("/");
  const numerator = Number(rawNumerator);
  const denominator = Number(rawDenominator);
  if (
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return 0;
  }
  return numerator / denominator;
}

export function getTargetVideoDimensions(width: number, height: number) {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };

  const landscape = width >= height;
  const maxWidth = landscape ? LANDSCAPE_MAX_WIDTH : LANDSCAPE_MAX_HEIGHT;
  const maxHeight = landscape ? LANDSCAPE_MAX_HEIGHT : LANDSCAPE_MAX_WIDTH;
  const scale = Math.min(1, maxWidth / width, maxHeight / height);

  return {
    width: Math.max(2, Math.floor((width * scale) / 2) * 2),
    height: Math.max(2, Math.floor((height * scale) / 2) * 2),
  };
}

export function evaluateVideoCompatibility(
  probe: VideoProbeResult,
): VideoCompatibility {
  const stream = probe.streams?.[0];
  if (!stream) {
    throw new Error("VIDEO_STREAM_MISSING");
  }

  const width = Number(stream.width) || 0;
  const height = Number(stream.height) || 0;
  if (width <= 0 || height <= 0) {
    throw new Error("VIDEO_DIMENSIONS_INVALID");
  }

  const averageFrameRate = parseFrameRate(stream.avg_frame_rate);
  const peakFrameRate = parseFrameRate(stream.r_frame_rate);
  const framesPerSecond = Math.max(averageFrameRate, peakFrameRate);
  const duration = Number(probe.format?.duration);
  const durationSeconds = Number.isFinite(duration) && duration > 0 ? duration : null;
  const target = getTargetVideoDimensions(width, height);
  const reasons: string[] = [];

  if (stream.codec_name?.toLowerCase() !== "h264") reasons.push("codec");
  if (!ANDROID_SAFE_H264_PROFILES.has(stream.profile?.toLowerCase() ?? "")) {
    reasons.push("profile");
  }
  if (!stream.level || stream.level > MAX_H264_LEVEL) reasons.push("level");
  if (stream.pix_fmt?.toLowerCase() !== "yuv420p") reasons.push("pixel-format");
  if (target.width !== width || target.height !== height) reasons.push("dimensions");
  if (framesPerSecond <= 0 || framesPerSecond > MAX_FRAMES_PER_SECOND + 0.1) {
    reasons.push("frame-rate");
  }

  return {
    stream,
    width,
    height,
    framesPerSecond,
    durationSeconds,
    requiresTranscode: reasons.length > 0,
    reasons,
  };
}
