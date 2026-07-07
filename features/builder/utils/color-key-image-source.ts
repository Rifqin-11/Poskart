export function getColorKeyImageSourceCandidates(src: string) {
  const source = src.trim();
  if (!source) return [];
  if (source.startsWith("data:") || source.startsWith("blob:")) return [source];

  const candidates = [source];
  if (/^https?:\/\//i.test(source)) {
    candidates.push(
      `/api/admin/builder/image-proxy?url=${encodeURIComponent(source)}`,
    );
  }

  return [...new Set(candidates)];
}

export async function fetchColorKeyImageBlob(src: string) {
  let lastError: unknown = null;

  for (const candidate of getColorKeyImageSourceCandidates(src)) {
    try {
      const response = await fetch(candidate, {
        mode: candidate.startsWith("/") ? "same-origin" : "cors",
      });
      if (!response.ok) {
        lastError = new Error(`Image request failed with ${response.status}`);
        continue;
      }
      return response.blob();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Unable to download image for background removal.");
}
