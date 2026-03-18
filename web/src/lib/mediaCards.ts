import "server-only";

import type { Locale } from "@/src/i18n/locales";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";

const MEDIA_BUCKET = "media";
let hasWarnedAboutMissingMediaTable = false;

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

const resolveThumbnailUrl = (thumbnailPath: string | null) => {
  if (thumbnailPath) {
    if (/^https?:\/\//i.test(thumbnailPath)) {
      return thumbnailPath;
    }

    const normalizedPath = thumbnailPath.replace(/^media\//, "");
    return getSupabasePublicReadClient().storage.from(MEDIA_BUCKET).getPublicUrl(normalizedPath).data.publicUrl;
  }

  return "/media/fallback-media.svg";
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

const biasAndShuffleMediaCards = (cards: ArtistMediaCard[]) =>
  [...cards]
    .map((card) => ({
      card,
      score: Math.random() + (card.type === "youtube_video" ? 0.35 : 0),
    }))
    .sort((left, right) => right.score - left.score)
    .map((entry) => entry.card);

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

  const cards = ((data ?? []) as ArtistMediaCardRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    type: row.type,
    url: row.url,
    thumbnailUrl: resolveThumbnailUrl(row.thumbnail_path),
    excerpt: row.excerpt,
    publishedAt: row.published_at,
    lang: row.lang,
    sortOrder: row.sort_order ?? 9999,
    externalSource: row.external_source,
    openMode: row.open_mode ?? (row.type === "youtube_video" ? "modal" : "external"),
  }));

  const orderedCards = biasAndShuffleMediaCards(dedupeMediaCardsByUrl(cards));

  return typeof limit === "number" ? orderedCards.slice(0, limit) : orderedCards;
};
