# M01 — Community Network

Profile-based member discovery with AI-powered compatibility matching. Members post offers (skills/resources they provide) and seeks (things they need), and the system surfaces alignment scores based on values, skills, personality, and goals.

## Routes

| Route | File |
|-------|------|
| `/members` | `app/members/page.tsx` → inline (imports `MemberList`) |
| `/members/discover` | `app/members/discover/page.tsx` → `DiscoverClient` |
| `/members/matches` | `app/members/matches/page.tsx` → `MatchesTabs` |
| `/members/offers` | `app/members/offers/page.tsx` → `OffersPage` |
| `/members/requests` | `app/members/requests/page.tsx` → `SeeksPage` |
| `/members/profile` | `app/members/profile/page.tsx` → `ProfilePage` |

## Files

| File | Purpose |
|------|---------|
| `MemberList.tsx` | Grid of member cards with match score badges |
| `DiscoverClient.tsx` | Filterable/searchable full member directory |
| `MatchesTabs.tsx` | Tabbed view of Top / Good / Potential matches |
| `NetworkSidebar.tsx` | Left sidebar with nav links and user summary |
| `OffersPage.tsx` | CRUD interface for user's skill/resource offers |
| `SeeksPage.tsx` | CRUD interface for user's help requests |
| `ProfilePage.tsx` | User's own profile view (avatar upload, tabs) |
| `lib/match-score.ts` | **Core matching algorithm** — scores two bios across skills, interests, OCEAN, and MBTI |

## Match scoring

`lib/match-score.ts` exports `computeMatch(myBio, theirBio)` which returns `{ score: number, reasons: string[] }`.

| Dimension | Max points | Notes |
|---|---|---|
| Shared skills | 25 | 5/match, fuzzy (Levenshtein ≥80%) — tolerates typos and minor wording differences |
| Shared interests | 15 | 3/match, fuzzy |
| OCEAN similarity | 20 | Average abs-diff across 5 traits |
| MBTI compatibility | 20 | Curated ideal-pair table + temperament fallback |
| Location proximity | 5 | Country + city, fuzzy. City+country = 5, country only = 3 |
| Travel overlap | 10 | Same destination with overlapping dates = 10, within 30 days = 6, same destination alone = 4 |
| Aligned goals | 5 | Shared regenerative keywords in `goals` (`community`, `regenerative`, `sustainable`, `permaculture`, `nature`, `spiritual`) |
| **Total** | **100** | |

Callers must merge `city` and `country` from `user_profiles` onto the bio object before calling — those fields don't live on `user_bio`. See `web/src/app/members/page.tsx` for the pattern.

## Database tables

| Table | Access |
|-------|--------|
| `user_profiles` | Read/write — member cards, profile page |
| `user_bio` | Read/write — match scoring data |
| `user_offers` | Read/write — offers CRUD |
| `user_requests` | Read/write — seeks CRUD |

## How to work on this module

```bash
cd web && npm run dev
# Navigate to http://localhost:3000/network
```

To modify matching logic, edit `lib/match-score.ts`. The function is pure (no DB calls) and easy to unit-test.

To add a new member card field, update `MemberList.tsx` and the relevant Supabase select query in `app/members/page.tsx`.


## v4 look (v4.45.0)

With `"design": "v4"`, `/members` renders `MembersV4.tsx` (data in the page, grid in `MembersGridV4.tsx`) and the layout shows `MembersTabsV4.tsx` instead of `NetworkSidebar`.
