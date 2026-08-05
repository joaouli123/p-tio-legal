import { supabase } from './supabase';

export const PHOTO_BUCKET = 'fotos-veiculos';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const CACHE_SAFETY_SECONDS = 60;

type PhotoTransform = {
  width?: number;
  height?: number;
  resize?: 'cover' | 'contain' | 'fill';
};

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

/**
 * Resolves a private photo path into a short-lived URL. The legacy `url`
 * value is kept only as a compatibility fallback while old rows are migrated.
 */
export async function getSignedPhotoUrl(
  storagePath?: string | null,
  fallbackUrl?: string | null,
  transform?: PhotoTransform,
): Promise<string | null> {
  if (!storagePath) return fallbackUrl ?? null;

  const transformKey = transform ? JSON.stringify(transform) : '';
  const cacheKey = `${storagePath}:${transformKey}`;
  const cached = signedUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  let data: { signedUrl: string } | null = null;
  let error: unknown = null;
  try {
    const result = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, transform ? { transform } : undefined);
    data = result.data;
    error = result.error;
  } catch (signingError) {
    error = signingError;
  }

  if (error || !data?.signedUrl) return fallbackUrl ?? null;

  if (signedUrlCache.size > 2_000) {
    for (const [key, entry] of signedUrlCache) {
      if (entry.expiresAt <= Date.now()) signedUrlCache.delete(key);
    }
  }
  signedUrlCache.set(cacheKey, {
    url: data.signedUrl,
    expiresAt: Date.now() + (SIGNED_URL_TTL_SECONDS - CACHE_SAFETY_SECONDS) * 1000,
  });
  return data.signedUrl;
}

export async function withSignedPhotoUrl<T extends { storage_path?: string | null; url?: string | null }>(row: T) {
  return {
    ...row,
    url: await getSignedPhotoUrl(row.storage_path, row.url),
  };
}

export async function withSignedPhotoUrls<T extends { storage_path?: string | null; url?: string | null }>(rows: T[]) {
  return Promise.all(rows.map(withSignedPhotoUrl));
}
