import assert from "node:assert/strict";
import test from "node:test";
import {
  getFallbackBackgroundFromName,
  getPhoneCaseVariantLabel,
  getPhoneCaseVariantLabelForProduct,
} from "./catalogueModels.ts";

test("phone case variant labels prefer ornament names", () => {
  assert.equal(
    getPhoneCaseVariantLabel({
      id: "variant-1",
      background: { name: "Black" } as never,
      backgroundName: "Black",
      ornamentName: "Ornaments",
      name: "Black",
    }),
    "Ornaments",
  );
});

test("case-couple keeps black first and ornaments second", () => {
  assert.equal(
    getPhoneCaseVariantLabelForProduct(
      {
        id: "variant-black",
        background: { name: "Black" } as never,
        backgroundName: "Black with Ornaments",
        ornamentName: "Ornaments",
        name: "Black",
      },
      "case-couple",
    ),
    "Black",
  );

  assert.equal(
    getPhoneCaseVariantLabelForProduct(
      {
        id: "variant-ornaments",
        background: { name: "Ornaments" } as never,
        backgroundName: "Golden Ornaments",
        ornamentName: "Ornaments",
        name: "Ornaments",
      },
      "case-couple",
    ),
    "Ornaments",
  );
});

test("fallback backgrounds resolve case ornament aliases to ornaments", () => {
  assert.equal(getFallbackBackgroundFromName("ornaments")?.code, "ornaments");
  assert.equal(getFallbackBackgroundFromName("ornament")?.code, "ornaments");
  assert.equal(getFallbackBackgroundFromName("black")?.code, "black");
  assert.equal(getFallbackBackgroundFromName("black with ornaments")?.code, "ornaments");
  assert.equal(getFallbackBackgroundFromName("golden ornaments")?.code, "ornaments");
});
