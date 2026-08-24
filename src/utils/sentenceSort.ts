import { SavedSentence } from '../types';

/**
 * Sorts sentences within a section according to user's customized orderIndex (1, 2, 3...).
 * Fallback to creation date (chronological / oldest first) if orderIndex is undefined.
 */
export function sortSectionSentences(sentences: SavedSentence[]): SavedSentence[] {
  return [...sentences].sort((a, b) => {
    const hasOrderA = a.orderIndex !== undefined && a.orderIndex !== null;
    const hasOrderB = b.orderIndex !== undefined && b.orderIndex !== null;

    if (hasOrderA && hasOrderB) {
      if (a.orderIndex! !== b.orderIndex!) {
        return a.orderIndex! - b.orderIndex!;
      }
    } else if (hasOrderA) {
      return -1; // Explicitly ordered sentences come first
    } else if (hasOrderB) {
      return 1;
    }

    // Fallback: Chronological order (oldest first) so initial natural sequence is preserved
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    
    if (timeA && timeB) {
      return timeA - timeB;
    }
    return 0;
  });
}
