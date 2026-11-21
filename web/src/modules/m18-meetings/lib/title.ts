/**
 * A meeting's name never carries its date: the date is shown beside it (the list's date box, the page,
 * the note's front matter and file name). Older names had one in front ("17.11.2026 …"); Fireflies and
 * people sometimes add one at the end ("… 17/11/26"). Safe for the browser (no server code).
 */
const D = String.raw`(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4})`
const LEADING = new RegExp(String.raw`^\s*(?:${D}|\d{1,2} \d{1,2} \d{4})\s*[-–·:|,]?\s*`)
const TRAILING = new RegExp(String.raw`\s*[-–·:|,]?\s*\(?${D}\)?\s*$`)

export const withoutDate = (title: string) => title.replace(LEADING, '').replace(TRAILING, '').trim() || title.trim()
