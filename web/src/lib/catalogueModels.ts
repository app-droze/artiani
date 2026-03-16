export const PRODUCT_TYPES = [
  "tablecloth_round",
  "tablecloth_square",
  "table_runner",
  "pillow",
  "scarf",
] as const;

export type CatalogueProductType = (typeof PRODUCT_TYPES)[number];
export type CatalogueVisibleFilter = "cloths" | "runners" | "pillows" | "scarves";

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

export const getCatalogueShapeKey = (productType: CatalogueProductType) => {
  if (productType === "tablecloth_round") return "round";
  if (productType === "tablecloth_square") return "rectangular";
  return null;
};

export const getCatalogueVisibleFilter = (
  productType: CatalogueProductType,
): CatalogueVisibleFilter => {
  if (productType === "tablecloth_round" || productType === "tablecloth_square") {
    return "cloths";
  }
  if (productType === "table_runner") return "runners";
  if (productType === "pillow") return "pillows";
  return "scarves";
};

export const getCatalogueSectionLabelKey = (filter: CatalogueVisibleFilter) =>
  `catalogue.common.${filter}` as const;

export const getCatalogueProductLabel = (productType: CatalogueProductType) => {
  if (productType === "tablecloth_round") {
    return {
      primaryKey: "catalogue.common.cloth",
      secondaryKey: "catalogue.shapes.round",
    } as const;
  }

  if (productType === "tablecloth_square") {
    return {
      primaryKey: "catalogue.common.cloth",
      secondaryKey: "catalogue.shapes.rectangular",
    } as const;
  }

  if (productType === "table_runner") {
    return {
      primaryKey: "catalogue.common.runner",
      secondaryKey: null,
    } as const;
  }

  if (productType === "pillow") {
    return {
      primaryKey: "catalogue.common.pillow",
      secondaryKey: null,
    } as const;
  }

  return {
    primaryKey: "catalogue.common.scarf",
    secondaryKey: null,
  } as const;
};

export const isCatalogueVisibleFilter = (
  value: string | undefined,
): value is CatalogueVisibleFilter =>
  value === "cloths" || value === "runners" || value === "pillows" || value === "scarves";
