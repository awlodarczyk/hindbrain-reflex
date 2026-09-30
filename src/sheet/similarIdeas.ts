import type { IdeaListItem } from '../shared';

export const MIN_WORDS_FOR_SIMILAR = 3;
const MAX_SUGGESTIONS = 3;
const MIN_WORD_LENGTH = 3;
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'please', 'app', 'add', 'can', 'would', 'should',
  'dla', 'jak', 'aby', 'żeby', 'oraz', 'przy', 'może', 'proszę', 'dodać', 'aplikacji',
]);

const words = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length >= MIN_WORD_LENGTH && !STOP_WORDS.has(w));

// ponytail: word-overlap scoring on the device; move to server-side trigram search if lists grow past a few hundred ideas.
/** Up to 3 existing ideas that share words with `title`, best match first, once the title has 3+ words. */
export function findSimilarIdeas(title: string, ideas: readonly IdeaListItem[]): IdeaListItem[] {
  if (title.trim().split(/\s+/).length < MIN_WORDS_FOR_SIMILAR) return [];
  const query = new Set(words(title));
  return ideas
    .map((idea) => ({ idea, score: words(idea.title).filter((w) => query.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.idea.voteCount - a.idea.voteCount)
    .slice(0, MAX_SUGGESTIONS)
    .map((x) => x.idea);
}
