# Portal assistant

"Ask <community>" chat on every portal page (`AssistantChat.tsx`, mounted in `AppShell`). It answers
from the community Blueprint's answers and the documents in its library, cites sources
("Handbook p. 12", "Blueprint · 1.1 Finding Your Why"), and says when the material doesn't cover a question.

| Piece | What |
|---|---|
| `app/api/assistant/route.ts` | POST `{ messages }` → streamed answer (MiniMax-M3.1-Flash, low reasoning). Visitors: 2 questions per IP per 30 days (`X-Assistant-Remaining`), then 401 `needLogin`. Signed in: 200/day. |
| `lib/context.ts` | Blueprint answers as text; documents in full when ≤300k characters, else the pages that best match the conversation; the instructions (`assistantPrompt`). |
| `lib/library.ts`, `DocumentKindPicker.tsx` | The library (`community_documents`): every upload is asked to be **Shareable** (anyone using the assistant) or **Sensitive** (admins and circle leads only). |
| `m04-blueprint/DocumentsStep.tsx` | Blueprint › 📚 Documents: list, add, rename, re-classify, remove. The Blueprint import also asks and adds the document. |

**Who sees what is enforced by RLS**, not by the app: the assistant loads documents with the asker's own
session, so visitors and members only ever get shareable documents into their answers.
Usage counting: `assistant_count_question()` over `private.assistant_usage`.
