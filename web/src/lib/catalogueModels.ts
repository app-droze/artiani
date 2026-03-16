export const PRODUCT_TYPES = ["tablecloth_round", "tablecloth_square"] as const;

export type CatalogueProductType = (typeof PRODUCT_TYPES)[number];
export type CatalogueVisibleFilter = "cloths";

export type CatalogueVariantImage = {
  id: string;
  url: string;
  imageType: string | null;
};

export type CatalogueVariant = {
  id: string;
  name: string;
  backgroundName: string | null;
  ornamentName: string | null;
  sizeLabel: string | null;
  material: string | null;
  price: number;
  stockStatus: string | null;
  isDefault: boolean;
  sortOrder: number;
  images: CatalogueVariantImage[];
};

export type CatalogueProduct = {
  id: string;
  slug: string;
  productType: CatalogueProductType;
  title: string;
  subtitle: string | null;
  description: string | null;
  materialDescription: string | null;
  careInfo: string | null;
  defaultPrice: number;
  variantCount: number;
  cardImage: string | null;
  mainImage: string | null;
  gallery: string[];
  defaultVariant: CatalogueVariant | null;
  variants: CatalogueVariant[];
  sizes: string[];
};

export const getCatalogueShapeKey = (productType: CatalogueProductType) =>
  productType === "tablecloth_round" ? "round" : "rectangular";

export const isCatalogueVisibleFilter = (
  value: string | undefined,
): value is CatalogueVisibleFilter => value === "cloths";
