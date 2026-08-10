"use client";

import type {
  FFmpeg,
  LogEventCallback,
  ProgressEventCallback,
} from "@ffmpeg/ffmpeg";
import {
  evaluateVideoCompatibility,
  getTargetVideoDimensions,
  type VideoProbeResult,
} from "@/lib/video/video-compatibility";

export type VideoPreparationStatus = {
  message: string;
  detail?: string;
  progress?: number;
};

type PreparedVideo = {
  file: File;
  transcoded: boolean;
};

const FFMPEG_CORE_VERSION = "0.12.10";
const DEFAULT_CORE_BASE_URL =
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;
const PREPARATION_TIMEOUT_MS = 15 * 60 * 1000;

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoadPromise: Promise<FFmpeg> | null = null;
let preparationQueue: Promise<void> = Promise.resolve();

function friendlyPreparationError(error: unknown) {
  if (error instanceof Error && error.message === "VIDEO_TOO_LARGE_AFTER_PREPARATION") {
    return new Error(
      "The prepared video is still larger than 200 MB. Please choose a shorter video.",
    );
  }
  return new Error(
    "This video could not be prepared for POSKART devices. Try exporting it again or choose another video.",
  );
}

function runSerially<T>(task: () => Promise<T>) {
  const result = preparationQueue.then(task, task);
  preparationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function loadFfmpeg(
  onStatus?: (status: VideoPreparationStatus) => void,
) {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    if (
      typeof window === "undefined" ||
      typeof Worker === "undefined" ||
      typeof WebAssembly === "undefined"
    ) {
      throw new Error("VIDEO_PREPARATION_UNAVAILABLE");
    }

    onStatus?.({
      message: "Preparing the video checker...",
      detail: "First use needs a one-time browser download. Keep this tab open.",
      progress: 2,
    });

    const [{ FFmpeg }, { toBlobURL }] = await Promise.all([
      import("@ffmpeg/ffmpeg"),
      import("@ffmpeg/util"),
    ]);
    const baseUrl =
      process.env.NEXT_PUBLIC_FFMPEG_CORE_BASE_URL?.replace(/\/+$/, "") ||
      DEFAULT_CORE_BASE_URL;
    const instance = new FFmpeg();

    try {
      const [coreUrl, wasmUrl] = await Promise.all([
        toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
        toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm"),
      ]);
      await instance.load({ coreURL: coreUrl, wasmURL: wasmUrl });
      ffmpegInstance = instance;
      return instance;
    } catch (error) {
      instance.terminate();
      throw error;
    }
  })().finally(() => {
    ffmpegLoadPromise = null;
  });

  return ffmpegLoadPromise;
}

async function safelyDeleteFile(ffmpeg: FFmpeg, path: string) {
  try {
    await ffmpeg.deleteFile(path);
  } catch {
    // Cleanup is best-effort; the job uses unique paths.
  }
}

function preparedFileName(name: string) {
  const base = name.replace(/\.[^.]+$/, "").trim() || "video";
  return `${base}-poskart.mp4`;
}

function inputFileName(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]{2,5}$/.test(extension)) {
    return `source.${extension}`;
  }
  if (file.type === "video/quicktime") return "source.mov";
  if (file.type === "video/webm") return "source.webm";
  return "source.mp4";
}

async function prepareVideoJob(
  file: File,
  onStatus?: (status: VideoPreparationStatus) => void,
): Promise<PreparedVideo> {
  onStatus?.({
    message: "Checking video...",
    detail: "Compatibility is checked on this computer before upload.",
    progress: 1,
  });

  const ffmpeg = await loadFfmpeg(onStatus);
  const { FFFSType } = await import("@ffmpeg/ffmpeg");
  const jobId = crypto.randomUUID();
  const mountPath = `/builder-input-${jobId}`;
  const inputName = inputFileName(file);
  const inputPath = `${mountPath}/${inputName}`;
  const probePath = `/builder-probe-${jobId}.json`;
  const outputPath = `/builder-output-${jobId}.mp4`;
  let mounted = false;
  const recentLogs: string[] = [];
  const logListener: LogEventCallback = ({ message }) => {
    recentLogs.push(message);
    if (recentLogs.length > 30) recentLogs.shift();
  };
  ffmpeg.on("log", logListener);

  try {
    await ffmpeg.createDir(mountPath);
    await ffmpeg.mount(
      FFFSType.WORKERFS,
      { blobs: [{ name: inputName, data: file }] },
      mountPath,
    );
    mounted = true;

    const probeExitCode = await ffmpeg.ffprobe(
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=codec_name,profile,level,pix_fmt,width,height,avg_frame_rate,r_frame_rate:format=duration",
        "-of",
        "json",
        inputPath,
        "-o",
        probePath,
      ],
      60_000,
    );
    let rawProbe: Uint8Array | string;
    try {
      rawProbe = await ffmpeg.readFile(probePath, "utf8");
    } catch (error) {
      console.error(
        `Builder video probe failed with code ${probeExitCode}`,
        recentLogs.join("\n"),
        error,
      );
      throw new Error("VIDEO_PROBE_FAILED");
    }
    // ffprobe.wasm 0.12.10 may return -1 even after writing valid output.
    // The generated JSON is the reliable success signal.
    if (typeof rawProbe !== "string" || rawProbe.trim().length === 0) {
      throw new Error("VIDEO_PROBE_INVALID");
    }
    const compatibility = evaluateVideoCompatibility(
      JSON.parse(rawProbe) as VideoProbeResult,
    );

    onStatus?.({
      message: "Preparing video for your devices...",
      detail: "This runs on this computer and does not use a paid service.",
      progress: 8,
    });

    const progressListener: ProgressEventCallback = ({ progress }) => {
      if (!Number.isFinite(progress)) return;
      onStatus?.({
        message: "Preparing video for your devices...",
        detail: "Keep this tab open until preparation is complete.",
        progress: Math.round(8 + Math.min(1, Math.max(0, progress)) * 84),
      });
    };
    ffmpeg.on("progress", progressListener);

    try {
      const command = compatibility.requiresTranscode
        ? buildTranscodeCommand(inputPath, outputPath, compatibility)
        : [
            "-i",
            inputPath,
            "-map",
            "0:v:0",
            "-c:v",
            "copy",
            "-an",
            "-movflags",
            "+faststart",
            outputPath,
          ];
      const exitCode = await ffmpeg.exec(command, PREPARATION_TIMEOUT_MS);
      if (exitCode !== 0) {
        console.error("Builder video conversion failed", recentLogs.join("\n"));
        throw new Error("VIDEO_PREPARATION_FAILED");
      }
    } finally {
      ffmpeg.off("progress", progressListener);
    }

    const rawOutput = await ffmpeg.readFile(outputPath);
    if (!(rawOutput instanceof Uint8Array) || rawOutput.byteLength === 0) {
      throw new Error("VIDEO_OUTPUT_EMPTY");
    }

    const outputBytes = new Uint8Array(rawOutput.byteLength);
    outputBytes.set(rawOutput);
    const prepared = new File(
      [outputBytes.buffer],
      preparedFileName(file.name),
      { type: "video/mp4", lastModified: Date.now() },
    );
    if (prepared.size > 200 * 1024 * 1024) {
      throw new Error("VIDEO_TOO_LARGE_AFTER_PREPARATION");
    }

    onStatus?.({
      message: "Video is ready. Starting upload...",
      detail: "The uploaded file is compatible with POSKART devices.",
      progress: 100,
    });
    return {
      file: prepared,
      transcoded: compatibility.requiresTranscode,
    };
  } finally {
    ffmpeg.off("log", logListener);
    await safelyDeleteFile(ffmpeg, probePath);
    await safelyDeleteFile(ffmpeg, outputPath);
    if (mounted) {
      try {
        await ffmpeg.unmount(mountPath);
      } catch {
        // Best-effort cleanup.
      }
    }
    try {
      await ffmpeg.deleteDir(mountPath);
    } catch {
      // Best-effort cleanup.
    }
  }
}

function buildTranscodeCommand(
  inputPath: string,
  outputPath: string,
  compatibility: ReturnType<typeof evaluateVideoCompatibility>,
) {
  const target = getTargetVideoDimensions(
    compatibility.width,
    compatibility.height,
  );
  const filters = [`scale=${target.width}:${target.height}:flags=lanczos`];
  if (compatibility.framesPerSecond > 30.1 || compatibility.framesPerSecond <= 0) {
    filters.push("fps=30");
  }

  return [
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-vf",
    filters.join(","),
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-profile:v",
    "high",
    "-level:v",
    "4.1",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-movflags",
    "+faststart",
    "-threads",
    "1",
    outputPath,
  ];
}

export async function prepareBuilderVideo(
  file: File,
  onStatus?: (status: VideoPreparationStatus) => void,
) {
  try {
    return await runSerially(() => prepareVideoJob(file, onStatus));
  } catch (error) {
    // Keep technical details in DevTools while the Builder shows friendly copy.
    console.error("Builder video preparation failed", error);
    throw friendlyPreparationError(error);
  }
}
