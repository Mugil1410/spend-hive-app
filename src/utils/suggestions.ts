// Shared "did you mean this existing one?" suggestion helper for free-text name entry
// (categories, events, debtors, tags). Ranks by most-recent-use first so frequently/recently
// used names surface before alphabetical ones, and normalizes trim+lowercase so
// "Travel" / "travel" / " Travel " are treated as the same candidate.

export function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

export interface RankedLabel {
  label: string;
  lastUsedAt?: string; // ISO date of most recent use, when known
}

export function suggestLabels(query: string, items: RankedLabel[], limit = 5): string[] {
  const q = normalizeLabel(query);
  if (!q) return [];
  const seen = new Set<string>();
  const matches: RankedLabel[] = [];
  for (const item of items) {
    const key = normalizeLabel(item.label);
    if (!key.includes(q) || key === q || seen.has(key)) continue;
    seen.add(key);
    matches.push(item);
  }
  matches.sort((a, b) => {
    const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
    const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.label.localeCompare(b.label);
  });
  return matches.slice(0, limit).map((m) => m.label);
}
