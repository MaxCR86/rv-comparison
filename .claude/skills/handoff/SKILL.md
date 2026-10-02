---
name: handoff
description: Use when the user says to wrap up, close the loop, end the session, hand off, or save state for the next session — or when finished work needs to land (commit, push, merge or PR) before stopping.
---

# /handoff — close the loop

End-of-session ritual. Everything lands; nothing survives only in this session's memory. Run all five steps, in order, and report what happened at each. Where a step needs the repo's GitHub URL or name, derive it from `git remote get-url origin` — never hardcode a project name.

## 1. Land the work

- `git status` — nothing intentional stays uncommitted. Commit in logical chunks with real messages.
- Merge to main yourself, always: `git fetch origin main`, bring the session's work onto it, run the Verify commands (tests/build), push main, confirm the push landed. The user never merges by hand.
- Fall back to a branch ONLY when main cannot safely receive the work: tests or build fail, the push to main is rejected, or a conflict you cannot resolve with confidence. Push the branch and give the user the one-tap compare link `<origin URL>/compare/<branch>?expand=1` (or a PR link if `gh` works — never report a PR as existing unless you verified it).
- Never merge known-broken work to main, and never hide a failure — the fallback exists exactly for that case.

## 2. Write the baton

Overwrite the root `HANDOFF.md`. Fill this template exactly. Target under 25 lines — overflowing is a symptom of logging instead of handing off, and the fix is relocation, not deletion: durable knowledge (architecture, commands, conventions) moves to AGENTS.md in step 3; history stays in git log where it already lives. Real gotchas and genuine multi-step next actions may stretch the file; narrative never does. Every line must change what the next session does:

```markdown
# Handoff — <repo name> — <date from `date +%F`>
**State:** <one line: what works right now>
**Branch/PR:** <main, or branch + PR link + merged or not>
**Just done:** <1-3 bullets>
**Next:** <1-4 numbered items, most important first>
**Watch out:** <gotchas — omit the section if none>
**Verify:** <command(s) that should pass, e.g. npm run build>
```

HANDOFF.md is a snapshot, never a log — delete everything stale. The next session reads this file first; write it for a reader with zero context beyond the repo.

**Next is a menu, not marching orders.** The next session opens by reporting these recommendations and then waits for the user to choose — it never auto-executes an item, however obvious the first one looks. Reading the files needed to give that report is the only action the handoff licenses.

## 3. Sync AGENTS.md

If the stack, commands, or state drifted this session, fix AGENTS.md now (CLAUDE.md is a pointer to it). AGENTS.md is the durable source of truth; HANDOFF.md is the baton between sessions.

## 4. Design guardrail — only if UI changed this session

Skip this step entirely when the session touched no UI. Say you skipped it and why; do not perform it theatrically on a backend-only session.

**a. The guidelines must exist here.** The founder's UI/UX guidelines live in `docs/UI-GUIDELINES.md` and are the same in every project. If this repo has UI and lacks that file, copy it from this plugin's canonical copy at `../kickoff/templates/UI-GUIDELINES.md` (relative to this skill's base directory) before finishing. It is short; the founder approved each item individually, and the rejected items are recorded in it too so nobody re-proposes them.

Load-bearing ones, so a session cannot claim ignorance:
- The phone is the layout — one column, ~480px, widened up rather than shrunk down.
- **Five type sizes and two weights, total.** A hard cap. One radius scale.
- **Show, don't explain.** Minimal titles; whatever explanation survives hides behind a discreet "i". Helper paragraphs under form fields are a defect.
- Empty states are never blank — one sentence plus the gesture that fills them, *including* while content is still streaming.
- Comments record why, including what was rejected.

**b. `impeccable` is the go-to design framework and is not optional.** (impeccable.style — installed by `scripts/setup.sh`, or `npx --yes impeccable@latest install`.) Run **both** passes and report the counts:

```
node .claude/skills/impeccable/scripts/detect.mjs app lib          # static source scan

CI=1 PUPPETEER_EXECUTABLE_PATH=<path-to-chromium> \
  node .claude/skills/impeccable/scripts/detect.mjs --viewport 390x844 \
  http://localhost:3000/ <every other route>                       # live scan, app running
```

**Never report the static pass alone as "clean."** They find different things: on Dimaxinator the static scan returned zero findings while the live scan caught a WCAG contrast failure on the token carrying every label and hint in the product.

Three landmines that make the live scan look broken rather than failing loudly:
- It needs `puppeteer` as a dev dependency (`PUPPETEER_SKIP_DOWNLOAD=1` where a Chromium already exists).
- Running as root needs `CI=1` — that is what passes `--no-sandbox`. Without it the browser exits instantly.
- Scan at **390x844**, not the 1280x800 default. A phone-first product audited at desktop width is not audited.

Fix what it finds, or record explicitly in `HANDOFF.md` what you left and why. An unreported finding is a regression the next session inherits blind.

**c. Sync guideline changes home.** If `docs/UI-GUIDELINES.md` changed this session, the canonical copy must follow — taste does not fork:
- **Local (Mac):** copy the file over `~/Documents/Vibe/claude-plugins/plugin/skills/kickoff/templates/UI-GUIDELINES.md`, then commit and push that repo.
- **Cloud:** try `git clone https://github.com/MaxCR86/claude-plugins`, copy the file in, commit, push. If the clone or push is refused (no access from this environment), add a line to `HANDOFF.md`: "UI-GUIDELINES changed — next Mac session: sync it to claude-plugins."

## 5. Final commit and confirm

Commit the handoff and AGENTS.md updates, push, and confirm with the push output that it landed. Close by telling the user what landed on main and the single next step. Fallback case only: give the merge link and say explicitly that the next session starts from main and cannot see this baton until the branch merges — merging it is the user's first move before opening the next session.
