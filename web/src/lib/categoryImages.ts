const PRODUCTS_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`
  : null;

type CategoryImageSource = {
  heroDesktopPath?: string;
  heroMobilePath?: string;
  cardPath?: string;
};

const CATEGORY_IMAGE_SOURCES: Record<string, CategoryImageSource> = {
  works: {
    heroDesktopPath: "category-paintings-hero-desktop.jpg",
    heroMobilePath: "category-paintings-hero-mobile.jpg",
    cardPath: "category-paintings-hero-desktop.jpg",
  },
  tablecloth: {
    cardPath: "category-tablecloths-card.png",
  },
};

const toProductsPublicUrl = (storagePath: string | undefined) => {
  if (!storagePath || !PRODUCTS_PUBLIC_BASE_URL) {
    return null;
  }

  const normalizedPath = storagePath
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${PRODUCTS_PUBLIC_BASE_URL}/${normalizedPath}`;
};

export const getCategoryImageUrls = (categorySlug: string | null | undefined) => {
  const source = categorySlug ? CATEGORY_IMAGE_SOURCES[categorySlug] : null;

  return {
    heroDesktopUrl: toProductsPublicUrl(source?.heroDesktopPath),
    heroMobileUrl: toProductsPublicUrl(source?.heroMobilePath),
    cardImageUrl: toProductsPublicUrl(source?.cardPath ?? source?.heroDesktopPath),
  };
};
