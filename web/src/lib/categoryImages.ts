const PRODUCTS_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products`
  : null;

type CategoryImageSource = {
  heroDesktopPath?: string;
  heroMobilePath?: string;
  cardPath?: string;
  cardUrl?: string;
};

const CATEGORY_IMAGE_SOURCES: Record<string, CategoryImageSource> = {
  works: {
    heroDesktopPath: "category-paintings-hero-desktop-n.jpg",
    heroMobilePath: "category-paintings-hero-mobile-n.jpg",
    cardPath: "category-paintings-hero-desktop.jpg",
  },
  tablecloth: {
    cardPath: "category-tablecloths-card.jpg",
  },
  table_runner: {
    cardPath: "category-runners-card.jpg",
  },
  phone_case: {
    cardPath: "category-cases-card.jpeg",
  },
  pillow: {
    cardPath: "category-pillows-card.jpg",
  },
  headscarf: {
    cardPath: "category-scarves-card.jpg",
  },
  bag: {
    cardPath: "category-bags-card.jpeg",
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

const resolveCategoryImageUrl = ({
  url,
  path,
}: {
  url?: string;
  path?: string;
}) => url ?? toProductsPublicUrl(path);

export const getCategoryImageUrls = (categorySlug: string | null | undefined) => {
  const source = categorySlug ? CATEGORY_IMAGE_SOURCES[categorySlug] : null;

  return {
    heroDesktopUrl: toProductsPublicUrl(source?.heroDesktopPath),
    heroMobileUrl: toProductsPublicUrl(source?.heroMobilePath),
    cardImageUrl: resolveCategoryImageUrl({
      url: source?.cardUrl,
      path: source?.cardPath ?? source?.heroDesktopPath,
    }),
  };
};
