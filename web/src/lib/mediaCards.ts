import "server-only";

import type { Locale } from "@/src/i18n/locales";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";

const MEDIA_BUCKET = "media";
const YOUTUBE_TITLE_REVALIDATE_SECONDS = 60 * 60 * 12;
const DEFAULT_YOUTUBE_TITLE = "YouTube Video";
let hasWarnedAboutMissingMediaTable = false;
const youtubeTitleCache = new Map<string, Promise<string | null>>();

export type ArtistMediaCardType =
  | "youtube_video"
  | "facebook_post"
  | "exhibition"
  | "article"
  | "site_link";

export type ArtistMediaCard = {
  id: string;
  title: string;
  type: ArtistMediaCardType;
  url: string;
  thumbnailUrl: string | null;
  excerpt: string | null;
  publishedAt: string | null;
  lang: Locale | null;
  sortOrder: number;
  externalSource: string | null;
  openMode: "external" | "modal";
};

type ArtistMediaCardRow = {
  id: string;
  title: string;
  type: ArtistMediaCardType;
  url: string;
  thumbnail_path: string | null;
  excerpt: string | null;
  published_at: string | null;
  lang: Locale | null;
  sort_order: number | null;
  external_source: string | null;
  open_mode: "external" | "modal" | null;
};

const extractYouTubeVideoId = (url: string) => {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtu.be")) {
      const pathnameId = parsed.pathname.split("/").filter(Boolean)[0];
      return pathnameId || null;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const searchId = parsed.searchParams.get("v");
      if (searchId) return searchId;

      const segments = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = segments.findIndex((segment) => segment === "embed" || segment === "shorts");
      if (embedIndex >= 0) {
        return segments[embedIndex + 1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const isMeaningfulMediaTitle = (title: string | null | undefined) => {
  const normalized = title?.trim();
  if (!normalized) {
    return false;
  }

  return (
    !/^video(?:\s+\d+)?$/i.test(normalized) &&
    !/^youtube video$/i.test(normalized) &&
    !/^levan margiani\s+[—-]\s+video\s+\d+$/i.test(normalized)
  );
};

const fetchYouTubeTitle = async (videoId: string) => {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      {
        headers: {
          accept: "application/json",
        },
        next: {
          revalidate: YOUTUBE_TITLE_REVALIDATE_SECONDS,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { title?: unknown };
    const title = typeof data.title === "string" ? data.title.trim() : "";

    return title || null;
  } catch {
    return null;
  }
};

const getYouTubeTitle = (videoId: string) => {
  const cached = youtubeTitleCache.get(videoId);
  if (cached) {
    return cached;
  }

  const pendingTitle = fetchYouTubeTitle(videoId);
  youtubeTitleCache.set(videoId, pendingTitle);
  return pendingTitle;
};

const resolveThumbnailUrl = (
  thumbnailPath: string | null,
  type: ArtistMediaCardType,
  url: string,
) => {
  if (thumbnailPath) {
    if (/^https?:\/\//i.test(thumbnailPath)) {
      return thumbnailPath;
    }

    const normalizedPath = thumbnailPath.replace(/^media\//, "");
    return getSupabasePublicReadClient().storage.from(MEDIA_BUCKET).getPublicUrl(normalizedPath).data.publicUrl;
  }

  if (type === "youtube_video") {
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    }
  }

  return null;
};

const isMissingMediaTableError = (message: string, code?: string | null) =>
  code === "42P01" ||
  code === "PGRST205" ||
  message.includes("artist_media_cards");

const normalizeMediaUrl = (value: string) => {
  const trimmed = value.trim();

  try {
    const parsed = new URL(trimmed);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "") || "/";
    return `${parsed.origin}${normalizedPath}${parsed.search}`;
  } catch {
    return trimmed;
  }
};

const dedupeMediaCardsByUrl = (cards: ArtistMediaCard[]) => {
  const seen = new Set<string>();

  return cards.filter((card) => {
    const normalizedUrl = normalizeMediaUrl(card.url);
    if (seen.has(normalizedUrl)) {
      return false;
    }

    seen.add(normalizedUrl);
    return true;
  });
};

export const getArtistMediaCards = async (limit?: number): Promise<ArtistMediaCard[]> => {
  const supabase = getSupabasePublicReadClient();
  const { data, error } = await supabase
    .from("artist_media_cards")
    .select(
      "id, title, type, url, thumbnail_path, excerpt, published_at, lang, sort_order, external_source, open_mode",
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) {
    if (isMissingMediaTableError(error.message, error.code)) {
      if (!hasWarnedAboutMissingMediaTable) {
        console.warn("[mediaCards] artist_media_cards is not available yet; homepage media rail will stay empty.");
        hasWarnedAboutMissingMediaTable = true;
      }
      return [];
    }

    throw new Error(`[mediaCards] Failed to fetch media cards: ${error.message}`);
  }

  const cards = await Promise.all(
    ((data ?? []) as ArtistMediaCardRow[]).map(async (row) => {
      const videoId = row.type === "youtube_video" ? extractYouTubeVideoId(row.url) : null;
      const fetchedTitle = videoId ? await getYouTubeTitle(videoId) : null;
      const fallbackTitle = isMeaningfulMediaTitle(row.title) ? row.title.trim() : DEFAULT_YOUTUBE_TITLE;

      return {
        id: row.id,
        title: row.type === "youtube_video" ? fetchedTitle ?? fallbackTitle : row.title,
        type: row.type,
        url: row.url,
        thumbnailUrl: resolveThumbnailUrl(row.thumbnail_path, row.type, row.url),
        excerpt: row.excerpt,
        publishedAt: row.published_at,
        lang: row.lang,
        sortOrder: row.sort_order ?? 9999,
        externalSource: row.external_source,
        openMode: row.open_mode ?? (row.type === "youtube_video" ? "modal" : "external"),
      };
    }),
  );

  const orderedCards = dedupeMediaCardsByUrl(cards);

  return typeof limit === "number" ? orderedCards.slice(0, limit) : orderedCards;
};
