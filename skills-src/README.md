# Skills

Agent skills are written in this folder and nowhere else. Each skill is a directory
with a `SKILL.md`. The `name` in its frontmatter is lowercase letters, numbers, and
hyphens, and matches the directory name.

`node scripts/sync-skills.mjs` copies every skill into the directories agents read:

- `.agents/skills` for agents that follow `AGENTS.md`
- `.claude/skills` for Claude Code
- `.cursor/skills` for Cursor

`node scripts/sync-skills.mjs --check` fails when a generated copy differs from this
folder. Change the skill here, run the sync, and commit the source and the copies
together.
