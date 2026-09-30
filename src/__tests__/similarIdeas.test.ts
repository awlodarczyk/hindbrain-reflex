import { findSimilarIdeas, MIN_WORDS_FOR_SIMILAR } from "../sheet/similarIdeas";

const idea = (id: string, title: string, voteCount = 0) => ({ id, title, body: "", voteCount, votedByMe: false });
const ideas = [
  idea("1", "Dark mode for workout log", 41),
  idea("2", "Export history to CSV", 17),
  idea("3", "Dark theme for the whole app", 38),
  idea("4", "Apple Watch app", 128),
  idea("5", "Tryb ciemny w dzienniku", 3),
];

test("waits for enough words before suggesting", () => {
  expect(MIN_WORDS_FOR_SIMILAR).toBe(3);
  expect(findSimilarIdeas("dark mode", ideas)).toEqual([]);
});

test("ranks by shared words, then by votes, and caps at 3", () => {
  expect(findSimilarIdeas("Dark mode please for everything", ideas).map((i) => i.id)).toEqual(["1", "3"]);
});

test("ignores case, punctuation and short words; handles Polish letters", () => {
  expect(findSimilarIdeas("EXPORT my history!!", ideas).map((i) => i.id)).toEqual(["2"]);
  expect(findSimilarIdeas("ciemny tryb dla dziennika", ideas).map((i) => i.id)).toEqual(["5"]);
});

test("returns nothing when no words overlap", () => {
  expect(findSimilarIdeas("push notifications for sessions", ideas)).toEqual([]);
});
