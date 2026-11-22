export interface TagCarrier {
  tag?: string | null;
  tags?: string[] | null;
}

/**
 * Parses a raw comma-separated tag string into normalized unique tags.
 */
export function parseTagString(raw?: string | null): string[] {
  if (!raw || typeof raw !== "string") return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(trimmed);
    }
  }
  return result;
}

/**
 * Merges an existing list of tags with newly parsed tags, preserving order and avoiding case-insensitive duplicates.
 */
export function mergeUniqueTags(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  const next = [...existing];
  for (const raw of incoming) {
    for (const part of parseTagString(raw)) {
      const key = part.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        next.push(part);
      }
    }
  }
  return next;
}

/**
 * Returns the individual tags of a question/item, using `tags` array if present or splitting `tag` by commas.
 */
export function getQuestionTags(item?: TagCarrier | null): string[] {
  if (!item) return [];
  if (Array.isArray(item.tags) && item.tags.length > 0) {
    return mergeUniqueTags([], item.tags);
  }
  if (typeof item.tag === "string" && item.tag.trim().length > 0) {
    return parseTagString(item.tag);
  }
  return [];
}
