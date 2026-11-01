const read = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
};
export const getFavorites = () => read<string[]>("apihub:favorites", []);
export const saveFavorites = (items: string[]) => localStorage.setItem("apihub:favorites", JSON.stringify(items));
export interface Collection { id: string; name: string; description: string; apiIds: string[]; }
export const getCollections = () => read<Collection[]>("apihub:collections", [
  { id:"starter", name:"My Starter Stack", description:"APIs I want to explore.", apiIds:[] }
]);
export const saveCollections = (items: Collection[]) => localStorage.setItem("apihub:collections", JSON.stringify(items));
