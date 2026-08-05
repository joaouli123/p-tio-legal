// Client-side image validation + compression before uploading to Supabase
// storage. Mirrors the mobile app's behaviour: reject oversized files, then
// downscale to a max edge and re-encode as JPEG to keep uploads small.

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
const SAFE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'foto.jpg';
}

export class ImageTooLargeError extends Error {
  constructor(sizeBytes: number) {
    const mb = (sizeBytes / (1024 * 1024)).toFixed(1);
    super(`A imagem tem ${mb} MB e excede o limite de 15 MB. Reduza a resolução e tente novamente.`);
    this.name = 'ImageTooLargeError';
  }
}

interface CompressOptions {
  maxEdge?: number; // longest side in pixels
  quality?: number; // JPEG quality 0..1
}

/**
 * Validate size, then compress an image File to a JPEG Blob (downscaled to
 * ~maxEdge). Non-image files and unexpected failures fall back to the original
 * File so uploads never break — the size check still applies to images.
 */
export async function prepareImageForUpload(
  file: File,
  { maxEdge = 1920, quality = 0.82 }: CompressOptions = {},
): Promise<{ blob: Blob; contentType: string; filename: string }> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageTooLargeError(file.size);
  }

  if (!SAFE_IMAGE_TYPES.has(file.type)) {
    throw new Error('Envie apenas imagens JPEG, PNG, WebP ou HEIC.');
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
    const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return { blob: file, contentType: file.type, filename: safeFilename(file.name) };
    }
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', quality);
    });

    if (!blob) {
      return { blob: file, contentType: file.type, filename: safeFilename(file.name) };
    }

    // If compression didn't help (e.g. already tiny), keep the smaller of the two.
    const finalBlob = blob.size < file.size ? blob : file;
    const isJpeg = finalBlob === blob;
    const filename = isJpeg ? safeFilename(file.name.replace(/\.[^.]+$/, '') + '.jpg') : safeFilename(file.name);
    return {
      blob: finalBlob,
      contentType: isJpeg ? 'image/jpeg' : (file.type || 'image/jpeg'),
      filename,
    };
  } catch {
    // Decoding failed — fall back to the original (already size-checked) file.
    return { blob: file, contentType: file.type, filename: safeFilename(file.name) };
  }
}
