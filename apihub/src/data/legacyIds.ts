/** Catalog ids that were merged into another record when duplicates were removed. Used to migrate saved data and old links. */
export const LEGACY_IDS: Record<string, string> = {
  "routing-osrm": "osrm",
  "exchange-rate": "exchangerate-api",
  "dummyjson-products": "dummyjson",
};
