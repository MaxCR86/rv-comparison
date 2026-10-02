---
name: add-secret
description: Use when an app needs a new secret, API key, token, or credential; when the user pastes or offers to paste one into chat; when work is blocked waiting on a credential; or when checking that a secret was configured in the environment.
---

# /add-secret

The only path for secrets in this repo. A secret's value may exist in exactly two places: the claude.ai environment settings (cloud sessions) or a local `.env` the user edits themselves — never you; a PreToolUse hook blocks `.env*` writes. It never appears in chat, code, commits, or command output. Violating the letter of this rule is violating its spirit.

**The one-bit invariant:** the only information about a secret's value that may ever reach the transcript, a file, or a commit is whether it is empty. Not its length, prefix, suffix, format, or live/test mode — any output computed from the value IS the value leaking, one bit at a time.

## If a value is already in chat

It is burned — transcripts persist. Say so, tell the user to revoke and re-mint it, and never store or use the pasted value, not even temporarily. Same for any key found in git history or old files.

## Adding a secret — walk the user through ALL of these

1. **Name it.** SCREAMING_SNAKE_CASE; use the name the SDK expects (`OPENAI_API_KEY`); prefix with the app name only on a naming collision.
2. **Mint it fresh.** A new key, scoped as narrowly as the provider allows, revocable when the experiment dies. Never reuse production's.
3. **Add it (from the phone).** In the phone's browser open claude.ai/code ("Request desktop site" if controls are missing) → tap the environment name above the message box → gear icon on the environment → "Environment variables" → add `NAME=value`, one per line → save. (The "Setup script" field alongside it should say `bash scripts/setup.sh`.)
4. **Hand off.** Every reply that tells the user to add a variable MUST include this block, verbatim with NAME filled in:

   > Only sessions started AFTER you save will see NAME — this session can't, no matter when you tell me it's saved. Once it's in, start a fresh session and say: "verify NAME with /add-secret, then continue."

   Then commit current work so the next session inherits it.
5. **Verify** — in the next session, using the only approved check below.
6. **Document.** Add `NAME=` with a one-line comment (what it's for, where to mint and revoke it) to the root `.env.example`. Commit.

## Verifying a secret — the only approved check

```
test -n "$NAME" && echo "NAME is set" || echo "NAME is NOT set"
```

Those two strings are the only acceptable outputs. If the variable is absent, the fix is a new session started after saving (see the handoff block) — not a workaround.

Wanting to confirm it's the *right* key — well-formed, live vs test, correct account? You can't, not from here: any format check reads the value, and any output derived from it leaks it. A wrong key announces itself as a 401/authentication error at first real use, and that error message is safe to relay. Presence is the whole check.

## Rationalizations that already failed testing

| Excuse | Reality |
|--------|---------|
| "Prefix + last 4 is enough; the provider's dashboard shows last 4 too" | The dashboard is an authenticated page. This transcript is a persisted log. Print nothing derived from the value. |
| "I'm checking without printing the value" (while slicing it) | If any character of the secret reaches output, you printed the value. `test -n` outputs none. |
| "Length isn't the value" / "live-vs-test mode is a non-sensitive marker" | Both are computed from the value — that is the value leaking. Presence only. |
| "The skill says existence + length + prefix marker is fine" | It never has. If you remember a permissive version of this rule, re-read this file instead of trusting the memory. |
| "Printing a fragment beats dumping the whole thing" | Less-bad is still a leak. The only safe outputs are "set" / "NOT set". |
| "It's only a test key" | Test keys carry quota and abuse surface. Same rules, same rotation. |

## Red flags — STOP

- Writing any `.env*` file (the hook blocking you is this skill talking)
- A command whose output could contain anything computed from the value: `echo $NAME`, `printenv`, `env | grep`, lengths, slices, masks, mode markers
- Reading the variable for any purpose other than the app's own runtime use — validators, classifiers, "well-formed" checks
- Asking the user to paste a value into chat "just this once"
- Hardcoding a real-looking value so the build passes — placeholders must be obviously fake (`sk_test_placeholder_not_a_real_key`)
- Promising to test "for real" as soon as the user says the variable is saved — this session will never see it
