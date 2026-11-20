/** What the match score is made of (shown under "How matching works"). Keep in step with match-score.ts. */
export const MATCH_DIMENSIONS = [
  { label: 'Shared skills',       max: 25, note: 'fuzzy — tolerates typos' },
  { label: 'Shared interests',    max: 15, note: 'fuzzy' },
  { label: 'OCEAN similarity',    max: 20, note: '5 personality traits' },
  { label: 'MBTI compatibility',  max: 20, note: 'ideal pairs + temperament' },
  { label: 'Location proximity',  max:  5, note: 'city + country' },
  { label: 'Travel overlap',      max: 10, note: 'same place + dates' },
  { label: 'Aligned goals',       max:  5, note: 'regenerative keywords' },
]
