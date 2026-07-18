/**
 * Client-side thumbnail generation (Phase C).
 * Returns a small JPEG data URL for library grid — not uploaded as separate blob.
 */

const MAX_EDGE = 320;
const JPEG_Q = 0.72;

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/jpeg', JPEG_Q);
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number
): void {
  const scale = Math.min(MAX_EDGE / sw, MAX_EDGE / sh, 1);
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  ctx.canvas.width = w;
  ctx.canvas.height = h;
  ctx.drawImage(source, 0, 0, w, h);
}

export async function thumbFromImageFile(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    drawCover(ctx, bitmap, bitmap.width, bitmap.height);
    bitmap.close();
    const url = canvasToDataUrl(canvas);
    // cap ~80KB data URL
    if (url.length > 120_000) return null;
    return url;
  } catch {
    return null;
  }
}

export async function thumbFromVideoFile(file: File): Promise<string | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error('video thumb timeout')), 12_000);
      video.onloadeddata = () => {
        window.clearTimeout(t);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(t);
        reject(new Error('video load failed'));
      };
    });

    // seek a bit in for a useful frame
    const target = Math.min(1, Math.max(0.1, (video.duration || 1) * 0.1));
    if (Number.isFinite(video.duration) && video.duration > 0) {
      await new Promise<void>((resolve) => {
        const onSeek = () => {
          video.removeEventListener('seeked', onSeek);
          resolve();
        };
        video.addEventListener('seeked', onSeek);
        try {
          video.currentTime = target;
        } catch {
          resolve();
        }
        // fallback
        window.setTimeout(resolve, 1500);
      });
    }

    const w = video.videoWidth || 0;
    const h = video.videoHeight || 0;
    if (!w || !h) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    drawCover(ctx, video, w, h);
    const url = canvasToDataUrl(canvas);
    if (url.length > 120_000) return null;
    return url;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function generateThumbDataUrl(file: File): Promise<string | null> {
  if (file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(file.name)) {
    return thumbFromImageFile(file);
  }
  if (file.type.startsWith('video/') || /\.(mp4|webm|ogg|mov|m4v)$/i.test(file.name)) {
    return thumbFromVideoFile(file);
  }
  return null;
}
