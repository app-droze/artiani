import assert from "node:assert/strict";
import test from "node:test";
import {
  getFallbackBackgroundFromName,
  getPhoneCaseVariantLabel,
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

test("fallback backgrounds resolve case ornament aliases to ornaments", () => {
  assert.equal(getFallbackBackgroundFromName("ornaments")?.code, "ornaments");
  assert.equal(getFallbackBackgroundFromName("ornament")?.code, "ornaments");
  assert.equal(getFallbackBackgroundFromName("black")?.code, "black");
  assert.equal(getFallbackBackgroundFromName("black with ornaments")?.code, "ornaments");
  assert.equal(getFallbackBackgroundFromName("golden ornaments")?.code, "ornaments");
});
