import type { MetadataRoute } from "next";
import { getPublicBaseUrl } from "@/src/lib/env.server";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getPublicBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/ka/cart",
        "/en/cart",
        "/ka/track",
        "/en/track",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
