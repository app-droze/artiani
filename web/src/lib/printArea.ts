import type { CatalogueProductType, CatalogueVariant } from "@/src/lib/catalogueModels";

type SizePair = {
  widthCm: number;
  heightCm: number;
};

export type ProductPrintArea = {
  full: SizePair;
  print: SizePair;
  hasReducedPrintArea: boolean;
};

const parseSizeLabel = (sizeLabel: string | null | undefined): SizePair | null => {
  if (!sizeLabel) return null;

  const match = sizeLabel.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;

  const widthCm = Number(match[1]);
  const heightCm = Number(match[2]);

  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm)) {
    return null;
  }

  return { widthCm, heightCm };
};

const getVariantFullSize = (variant: CatalogueVariant) =>
  variant.widthCm && variant.heightCm
    ? { widthCm: variant.widthCm, heightCm: variant.heightCm }
    : parseSizeLabel(variant.sizeLabel);

const getVariantPrintSize = (
  variant: CatalogueVariant,
  productContext: {
    productType: CatalogueProductType;
    categorySlug: string;
    subtypeCode: string | null;
  },
  fullSize: SizePair,
) => {
  if (
    productContext.categorySlug === "tablecloth" &&
    productContext.subtypeCode === "round"
  ) {
    return {
      widthCm: Math.min(fullSize.widthCm, 110),
      heightCm: Math.min(fullSize.heightCm, 110),
    };
  }

  if (
    productContext.categorySlug === "tablecloth" &&
    productContext.subtypeCode === "rectangular"
  ) {
    return {
      widthCm: Math.min(fullSize.widthCm, 110),
      heightCm: fullSize.heightCm,
    };
  }

  if (productContext.productType === "tablecloth_round") {
    return {
      widthCm: Math.min(fullSize.widthCm, 110),
      heightCm: Math.min(fullSize.heightCm, 110),
    };
  }

  if (productContext.productType === "tablecloth_square") {
    return {
      widthCm: Math.min(fullSize.widthCm, 110),
      heightCm: fullSize.heightCm,
    };
  }

  if (variant.printWidthCm && variant.printHeightCm) {
    return {
      widthCm: variant.printWidthCm,
      heightCm: variant.printHeightCm,
    };
  }

  return fullSize;
};

export const getVariantPrintArea = (
  variant: CatalogueVariant | null | undefined,
  productContext: {
    productType: CatalogueProductType;
    categorySlug: string;
    subtypeCode: string | null;
  },
): ProductPrintArea | null => {
  if (!variant) return null;

  const fullSize = getVariantFullSize(variant);
  if (!fullSize) return null;

  const printSize = getVariantPrintSize(variant, productContext, fullSize);
  const hasReducedPrintArea =
    printSize.widthCm < fullSize.widthCm || printSize.heightCm < fullSize.heightCm;

  return {
    full: fullSize,
    print: printSize,
    hasReducedPrintArea,
  };
};

export const formatPrintAreaSize = (size: SizePair) => `${size.widthCm} × ${size.heightCm} cm`;

export const isWhiteLikeColor = (label: string | null | undefined) => {
  if (!label) return false;

  const normalized = label
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.includes("white") || normalized.includes("ivory");
};
