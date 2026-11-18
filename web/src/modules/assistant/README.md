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

**Question log:** every question and answer is saved (`assistant_questions`, admins only); answers the sources don't cover end with a hidden `[[NOT_COVERED]]` marker, stripped from the stream and logged as `answered = false`. Admins triage them in Admin › Questions.

## Ask / Do (v4.26.0)

Signed in (joining members and above), the pop-up has **Ask | Do** tabs. In **Do** a person tells the agent what to
change on the board in plain words ("merge the 4 elements project into the 5 senses project"):

1. `POST /api/agent/plan { instruction, history }` → `lib/do-plan.ts` (MiniMax Flash, one call) reads the request
   against the board (projects P1…, open tasks T1…, people, circles) and proposes changes (`DoAction`s with real ids),
   or asks one question when it's unclear. **Nothing changes yet.**
2. The **confirm card** lists each change in plain words written by MyCoNet (`describe()` in `lib/do-actions.ts`, not
   by the AI), and marks the ones this person may not make (`blocked()`). **Do it** / **Cancel**.
3. `POST /api/agent/do { actions, instruction }` reads the board again, checks each change again with the person's
   rights (nothing from the card is trusted), makes it (`execute()`), and logs it in `agent_actions`
   (`actor: 'agent-do'`, `do_<kind>`, `requested_by`, `detail.rows` = every changed row's values before,
   `detail.created`). The circles touched get a project-manager review (their board notes stay current).
4. **Undo** on the card (and in the board's 🧭 panel): `/api/ops/agent-actions/[id]` puts the rows back and removes a
   project it made when empty. The person who asked, the circle's leads and admins can undo.

| Change | Who may (besides admins) |
|---|---|
| `create_circle` (name, purpose → its org-chart description, emoji; undo retires it) | circle leads |
| `merge_projects` (tasks move, the other project is set aside as paused), `rename_project` | the projects' leads/creators, the circle's leads |
| `create_project` (+ its tasks), `move_tasks` (into a project, or onto the main board) | the circle's leads; moves also the projects' leads |
| `rename_task`, `assign_task`, `confirm_drafts` | the task's circle or project leads |
| `set_task_date`, `set_task_status` | also the person on the task |

