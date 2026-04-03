import assert from "node:assert/strict";
import test from "node:test";
import { getFallbackBackgroundFromName, getVariantDisplayLabel } from "./catalogueModels.ts";

test("phone case variant labels prefer ornament names over background names", () => {
  assert.equal(
    getVariantDisplayLabel(
      {
        id: "variant-1",
        background: { name: "Black" } as never,
        backgroundName: "Black",
        ornamentName: "Ornaments",
        name: "Black",
      },
      { categorySlug: "phone_case" },
    ),
    "Ornaments",
  );
});

test("fallback backgrounds resolve ornament aliases for image swatches", () => {
  assert.equal(getFallbackBackgroundFromName("ornaments")?.code, "ornaments");
  assert.equal(getFallbackBackgroundFromName("ornament")?.code, "ornaments");
});
