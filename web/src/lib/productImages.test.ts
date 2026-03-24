import assert from "node:assert/strict";
import test from "node:test";
import {
  applyClothLargeMainImageOverride,
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

test("applyClothLargeMainImageOverride keeps existing images for 110x110 cloth selections", () => {
  const gallery = applyClothLargeMainImageOverride(filterVariantProductImages(images, "variant-1"), {
    productSlug: "cloth-rounded",
    sizeLabel: "110 × 110 cm",
    backgroundCode: "navy",
    backgroundName: "Navy",
  });

  assert.deepEqual(
    gallery.map((image) => image.storage_path),
    ["runner/shared-main.jpeg", "runner/detail-1.jpeg", "runner/detail-2.jpeg"],
  );
});

test("applyClothLargeMainImageOverride keeps existing images for 130x130 white cloth selections", () => {
  const gallery = applyClothLargeMainImageOverride(filterVariantProductImages(images, "variant-1"), {
    productSlug: "cloth-rectangular",
    sizeLabel: "130x130",
    backgroundCode: "white",
    backgroundName: "White",
  });

  assert.equal(gallery[0]?.storage_path, "runner/shared-main.jpeg");
});

test("applyClothLargeMainImageOverride swaps only the main image for eligible large cloth selections", () => {
  const gallery = applyClothLargeMainImageOverride(filterVariantProductImages(images, "variant-1"), {
    productSlug: "cloth-rectangular",
    sizeLabel: "140 × 240 cm",
    backgroundCode: "antique_bordeaux",
    backgroundName: "Antique Bordeaux",
  });

  assert.equal(
    gallery[0]?.url,
    "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/cloth-rectangular-antique_bordeaux-large-main.png",
  );
  assert.equal(gallery[0]?.storage_path, "cloth-rectangular-antique_bordeaux-large-main.png");
  assert.equal(gallery[1]?.storage_path, "runner/detail-1.jpeg");
  assert.equal(gallery[2]?.storage_path, "runner/detail-2.jpeg");
});

test("applyClothLargeMainImageOverride swaps to the circular lilac large main image when available", () => {
  const gallery = applyClothLargeMainImageOverride(filterVariantProductImages(images, "variant-1"), {
    productSlug: "cloth-rounded",
    sizeLabel: "130 × 130 cm",
    backgroundCode: "lilac",
    backgroundName: "Lilac",
  });

  assert.equal(
    gallery[0]?.url,
    "https://dndriddpzcnagjrjbsee.supabase.co/storage/v1/object/public/products/cloth-circular-lilac-large-main.png",
  );
  assert.equal(gallery[0]?.storage_path, "cloth-circular-lilac-large-main.png");
  assert.equal(gallery[1]?.storage_path, "runner/detail-1.jpeg");
});
