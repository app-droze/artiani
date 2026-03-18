type ProductImageLike = {
  image_type?: string | null;
  sort_order?: number | null;
  imageType?: string | null;
  sortOrder?: number | null;
};

const PRODUCT_IMAGE_TYPE_ORDER = ["main", "detail", "flat", "lifestyle"] as const;

const getImageType = (image: ProductImageLike) => image.image_type ?? image.imageType ?? null;
const getImageSortOrder = (image: ProductImageLike) => image.sort_order ?? image.sortOrder ?? 9999;

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
