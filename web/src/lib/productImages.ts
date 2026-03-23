type ProductImageLike = {
  id?: string;
  url?: string | null;
  storage_path?: string | null;
  storagePath?: string | null;
  variant_id?: string | null;
  variantId?: string | null;
  image_type?: string | null;
  sort_order?: number | null;
  imageType?: string | null;
  sortOrder?: number | null;
};

const PRODUCT_IMAGE_TYPE_ORDER = ["main", "detail", "flat", "lifestyle"] as const;

const getImageType = (image: ProductImageLike) => image.image_type ?? image.imageType ?? null;
const getImageSortOrder = (image: ProductImageLike) => image.sort_order ?? image.sortOrder ?? 9999;
const getImageStoragePath = (image: ProductImageLike) => image.storage_path ?? image.storagePath ?? null;
const getImageUrl = (image: ProductImageLike) => image.url ?? null;

export const getProductImageTypePriority = (imageType: string | null | undefined) => {
  const priority = PRODUCT_IMAGE_TYPE_ORDER.indexOf(
    imageType as (typeof PRODUCT_IMAGE_TYPE_ORDER)[number],
  );

  return priority === -1 ? PRODUCT_IMAGE_TYPE_ORDER.length : priority;
};

export const sortProductImages = <T extends ProductImageLike>(images: T[]) =>
  [...images].sort((left, right) => {
    const priorityDifference =
      getProductImageTypePriority(getImageType(left)) -
      getProductImageTypePriority(getImageType(right));

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return getImageSortOrder(left) - getImageSortOrder(right);
  });

export const pickPrimaryProductImage = <T extends ProductImageLike>(images: T[]) => {
  const sortedImages = sortProductImages(images);

  return (
    sortedImages.find((image) => getImageType(image) === "main") ??
    sortedImages[0] ??
    null
  );
};

export const pickMainProductImage = <T extends ProductImageLike>(images: T[]) =>
  sortProductImages(images).find((image) => getImageType(image) === "main") ?? null;

export const sortProductImagesBySortOrder = <T extends ProductImageLike>(images: T[]) =>
  [...images].sort((left, right) => getImageSortOrder(left) - getImageSortOrder(right));

export const dedupeProductImages = <T extends ProductImageLike>(images: T[]) => {
  const seen = new Set<string>();

  return images.filter((image, index) => {
    const key =
      getImageStoragePath(image) ??
      getImageUrl(image) ??
      image.id ??
      `${getImageType(image) ?? "image"}:${getImageSortOrder(image)}:${index}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

export const filterVariantProductImages = <T extends ProductImageLike>(
  images: T[],
  variantId: string,
) => images.filter((image) => (image.variant_id ?? image.variantId ?? null) === variantId);

export const filterProductLevelImages = <T extends ProductImageLike>(images: T[]) =>
  images.filter((image) => (image.variant_id ?? image.variantId ?? null) === null);

export const resolveProductGalleryImages = <T extends ProductImageLike>({
  variantImages,
  productImages,
}: {
  variantImages: T[];
  productImages: T[];
}) => {
  const exactSource = variantImages.length > 0 ? variantImages : productImages;
  const orderedImages = dedupeProductImages(sortProductImagesBySortOrder(exactSource));

  if (orderedImages.length === 0) {
    return [];
  }

  const heroImage = orderedImages.find((image) => getImageType(image) === "main");
  if (!heroImage) {
    return orderedImages;
  }

  return [heroImage, ...orderedImages.filter((image) => image !== heroImage)];
};

export const pickResolvedProductImage = <T extends ProductImageLike>(params: {
  variantImages: T[];
  productImages: T[];
}) => resolveProductGalleryImages(params)[0] ?? null;
