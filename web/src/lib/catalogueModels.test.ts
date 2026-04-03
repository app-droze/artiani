import assert from "node:assert/strict";
import test from "node:test";
import { getFallbackBackgroundFromName, getVariantBackgroundLabel } from "./catalogueModels.ts";

test("variant labels prefer background names over ornament names", () => {
  assert.equal(
    getVariantBackgroundLabel(
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
  assert.equal(getFallbackBackgroundFromName("black")?.code, "black");
  assert.equal(getFallbackBackgroundFromName("black with ornaments")?.code, "ornaments");
  assert.equal(getFallbackBackgroundFromName("golden ornaments")?.code, "golden");
});
