import type { MetadataRoute } from "next";
import { locales } from "@/src/i18n/locales";
import { getPublicBaseUrl } from "@/src/lib/env.server";
import { getSupabasePublicReadClient } from "@/src/lib/supabasePublic";
import { buildSeoPageUrl } from "@/src/lib/seo";

const getProductSlugs = async () => {
  const supabase = getSupabasePublicReadClient();
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[sitemap] failed to fetch product slugs", {
      code: error.code ?? null,
      message: error.message,
      details: error.details ?? null,
      hint: error.hint ?? null,
    });
    return [];
  }

  return (data ?? [])
    .map((row) => row.slug)
    .filter((slug): slug is string => typeof slug === "string" && slug.length > 0);
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getPublicBaseUrl();
  const productSlugs = await getProductSlugs();
  const staticPaths = ["", "/catalogue", "/delivery", "/returns", "/biography"] as const;

  const staticEntries = locales.flatMap((lang) =>
    staticPaths.map((path) => ({
      url: buildSeoPageUrl(baseUrl, lang, path),
    })),
  );

  const productEntries = locales.flatMap((lang) =>
    productSlugs.map((slug) => ({
      url: buildSeoPageUrl(baseUrl, lang, `/product/${slug}`),
    })),
  );

  return [...staticEntries, ...productEntries];
}
