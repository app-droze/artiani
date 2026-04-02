export const INVENTORY_ITEM_KINDS = ["sellable", "packaging", "gift"] as const;
export type InventoryItemKind = (typeof INVENTORY_ITEM_KINDS)[number];

export const INVENTORY_MOVEMENT_TYPES = [
  "purchase",
  "usage",
  "adjustment_in",
  "adjustment_out",
] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export const PRODUCT_TYPE_OPTIONS = [
  "painting",
  "tablecloth_square",
  "tablecloth_round",
  "pillow",
  "table_runner",
  "scarf",
  "phone_case",
  "handbag",
] as const;
export type InventoryProductType = (typeof PRODUCT_TYPE_OPTIONS)[number];

export const isInventoryItemKind = (value: string): value is InventoryItemKind =>
  INVENTORY_ITEM_KINDS.includes(value as InventoryItemKind);

export const isInventoryMovementType = (value: string): value is InventoryMovementType =>
  INVENTORY_MOVEMENT_TYPES.includes(value as InventoryMovementType);

export const isInventoryProductType = (value: string): value is InventoryProductType =>
  PRODUCT_TYPE_OPTIONS.includes(value as InventoryProductType);

export const normalizeInventoryCode = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "");
