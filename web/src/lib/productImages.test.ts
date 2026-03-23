import assert from "node:assert/strict";
import test from "node:test";
import {
  filterProductLevelImages,
  filterVariantProductImages,
  pickResolvedProductImage,
  resolveProductGalleryImages,
} from "./productImages.ts";

type FixtureImage = {
  id: string;
  variant_id: string | null;
  storage_path: string;
  image_type: string | null;
  sort_order: number | null;
};

const images: FixtureImage[] = [
  {
    id: "v1-main",
    variant_id: "variant-1",
    storage_path: "runner/shared-main.jpeg",
    image_type: "main",
    sort_order: 10,
  },
  {
    id: "v1-detail-1",
    variant_id: "variant-1",
    storage_path: "runner/detail-1.jpeg",
    image_type: "detail",
    sort_order: 20,
  },
  {
    id: "v1-detail-2",
    variant_id: "variant-1",
    storage_path: "runner/detail-2.jpeg",
    image_type: "detail",
    sort_order: 30,
  },
  {
    id: "v2-main",
    variant_id: "variant-2",
    storage_path: "runner/shared-main.jpeg",
    image_type: "main",
    sort_order: 10,
  },
  {
    id: "v2-detail",
    variant_id: "variant-2",
    storage_path: "runner/variant-2-detail.jpeg",
    image_type: "detail",
    sort_order: 20,
  },
  {
    id: "product-main",
    variant_id: null,
    storage_path: "product/fallback-main.jpeg",
    image_type: "main",
    sort_order: 5,
  },
  {
    id: "product-detail",
    variant_id: null,
    storage_path: "product/fallback-detail.jpeg",
    image_type: "detail",
    sort_order: 15,
  },
];

test("resolveProductGalleryImages keeps exact variant images even when sibling variants share storage paths", () => {
  const gallery = resolveProductGalleryImages({
    variantImages: filterVariantProductImages(images, "variant-1"),
    productImages: filterProductLevelImages(images),
  });

  assert.deepEqual(
    gallery.map((image) => image.storage_path),
    ["runner/shared-main.jpeg", "runner/detail-1.jpeg", "runner/detail-2.jpeg"],
  );
});

test("resolveProductGalleryImages preserves 1 main plus multiple detail images in stable sort order", () => {
  const gallery = resolveProductGalleryImages({
    variantImages: filterVariantProductImages(images, "variant-1"),
    productImages: [],
  });

  assert.equal(gallery[0]?.image_type, "main");
  assert.deepEqual(
    gallery.map((image) => `${image.image_type}:${image.sort_order}`),
    ["main:10", "detail:20", "detail:30"],
  );
});

test("resolveProductGalleryImages falls back only to product-level images when the selected variant has no images", () => {
  const gallery = resolveProductGalleryImages({
    variantImages: filterVariantProductImages(images, "missing-variant"),
    productImages: filterProductLevelImages(images),
  });

  assert.deepEqual(
    gallery.map((image) => image.storage_path),
    ["product/fallback-main.jpeg", "product/fallback-detail.jpeg"],
  );
});

test("pickResolvedProductImage never leaks sibling variant images into the selected variant thumbnail", () => {
  const thumbnail = pickResolvedProductImage({
    variantImages: filterVariantProductImages(images, "variant-2"),
    productImages: filterProductLevelImages(images),
  });

  assert.equal(thumbnail?.storage_path, "runner/shared-main.jpeg");
  assert.equal(thumbnail?.variant_id, "variant-2");
});
