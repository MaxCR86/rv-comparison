#!/usr/bin/env python3
"""Max's top-up guard. Iron rule: Claude never tops up any account without Max's
explicit approval, and never more than $999 per calendar month across all accounts
combined unless Max enters his override secret.

Looking is allowed (billing pages, balances). Moving money is not.
Test payments in Max's own dev app on a local host (localhost, *.test) are allowed.

Hook mode (no args): PreToolUse JSON on stdin; exit 2 blocks the tool call.
Max-only commands (need a real terminal; Claude's tools have none):
  approve     open a window for one top-up (15 min default, 24 h hard max), logged against the monthly cap
  unlock      open a 30-minute window in which Claude may edit the guard itself
  set-secret  set or change the over-the-cap override secret
  status      month total, windows, secret state
Self-check: test

Two copies, same file: the house plugin (travels to cloud sessions) and
~/.claude/guards/topup-guard.py (local anchor, wired in ~/.claude/settings.json).
State (ledger, windows, secret hash) lives only in ~/.claude/guards on Max's Mac,
so a cloud session can never be approved: top-ups there are always blocked.

ponytail: pattern matching on tool input. A guardrail against mistakes, not a sandbox.
The hard limit lives provider-side: no saved card, auto-recharge off, capped virtual card.
"""
import getpass, hashlib, hmac, json, os, re, sys, time
from pathlib import Path

STATE = Path.home() / ".claude" / "guards"
LEDGER, APPROVAL, SECRET, UNLOCK = (
    STATE / n for n in ("ledger.jsonl", "approval.json", "secret.json", "unlock.json"))
CAP = 999.0             # USD per calendar month, all accounts combined
MAX_WINDOW = 24 * 3600  # hard limit on how long one approval may stay open
UNLOCK_WINDOW = 30 * 60
ITERS = 600_000

MONEY = re.compile(
    r"\btop[\s_-]?ups?\b"
    r"|\badd[\s_-]?(more[\s_-]?)?(credits?|funds|balance|money)"
    r"|\b(buy|purchase)[\s_-]?(more[\s_-]?)?credits?|\bpurchase-[a-z]"
    r"|\bauto[\s_-]?(recharge|reload|refill|top)|\brecharge\b"
    r"|(checkout|buy)\.stripe\.com",
    re.I,
)
# A click/keystroke whose own summary says it pays for something.
PAY = re.compile(r'"action_summary": "[^"]*\b(pay(s|ing|ment)?|purchas(e|es|ing)|buy(s|ing)?)\b', re.I)
# Test payments in Max's own dev app: an action whose summary names a local dev host is
# not real money. ponytail: trusts Claude's own summary, same as PAY does.
SUMMARY = re.compile(r'"action_summary": "([^"]*)"')
LOCAL = re.compile(r"localhost|127\.0\.0\.1|\[::1\]|\w\.(test|localhost)\b", re.I)
# A write request to a billing-ish endpoint. Reads (GET, opening the page) stay allowed.
MUTATE = re.compile(r"-X\s*(POST|PUT|PATCH)|--request\s+(POST|PUT|PATCH)|--data|\s-d\s|--json"
                    r"|method\W{1,4}(POST|PUT|PATCH)|\.post\(", re.I)
BILLING = re.compile(r"billing|\bcredits?\b|\bpayments?\b", re.I)
NET = re.compile(r"curl|wget|https?://|\bhttp\b|\bstripe\b|\baws\b|\bgh\b|\bopen\s|\$B\b|browse", re.I)
SELF = re.compile(r"\.claude/guards|topup-guard|spend_guard", re.I)
SETTINGS = re.compile(r"\.claude/settings(\.local)?\.json$")
DISABLE = re.compile(r"disableAllHooks\W+true")
WATCHED = re.compile(r"^(Bash|WebFetch)$|^mcp__.*(browser|chrome|computer|terminal|aws)", re.I)
FILE_TOOLS = ("Read", "Edit", "Write", "NotebookEdit", "Grep", "Glob")
USER_SETTINGS = os.path.realpath(os.path.expanduser("~/.claude/settings.json"))

MSG = (
    "BLOCKED by Max's top-up guard: %s.\n"
    "Iron rule: no top-ups without Max's explicit approval; max $999/month across all accounts.\n"
    "Looking at billing pages and balances is fine; this call looked like it changes something.\n"
    "Do NOT work around this (no rephrasing, no other tool, no editing the guard). Stop and tell Max.\n"
    "Only Max can open a window, by hand, in a terminal on his own Mac:\n"
    "  python3 ~/.claude/guards/topup-guard.py approve   (one top-up; he picks the window, 24h max)\n"
    "  python3 ~/.claude/guards/topup-guard.py unlock    (let Claude edit the guard, 30 min)\n"
    "In a cloud session there is no approval: do it from the Mac.\n"
)


def window_open(f, limit):
    """Open only if it expires in the future and no further out than `limit` seconds."""
    try:
        return 0 < json.loads(f.read_text())["expires"] - time.time() <= limit
    except Exception:
        return False


def check(call, ok=None, unlocked=None):
    """Return a block reason, or None to allow."""
    tool = call.get("tool_name", "")
    inp = call.get("tool_input") or {}
    locked = not (window_open(UNLOCK, UNLOCK_WINDOW) if unlocked is None else unlocked)
    if tool in FILE_TOOLS:
        path = " ".join(str(inp.get(k, "")) for k in ("file_path", "path", "notebook_path")).strip()
        if locked and SELF.search(path):
            return "the guard's own files are Max-only"
        if locked and tool in ("Edit", "Write") and SETTINGS.search(path):
            if tool == "Edit":
                old, new = str(inp.get("old_string", "")), str(inp.get("new_string", ""))
            else:
                is_user = os.path.realpath(os.path.expanduser(inp.get("file_path", ""))) == USER_SETTINGS
                old, new = ("topup-guard" if is_user else ""), str(inp.get("content", ""))
            if ("topup-guard" in old and "topup-guard" not in new) or DISABLE.search(new):
                return "this edit would remove or disable the guard hook"
        return None
    if not WATCHED.search(tool):
        return None
    text = json.dumps(inp, ensure_ascii=False)
    if locked and (SELF.search(text) or "disableAllHooks" in text):
        return "the guard's own files and hook are Max-only"
    text = SUMMARY.sub(lambda m: "" if LOCAL.search(m.group(1)) else m.group(0), text)
    money = MONEY.search(text) or PAY.search(text) or (MUTATE.search(text) and BILLING.search(text))
    if money and (tool != "Bash" or NET.search(text)):
        if not (window_open(APPROVAL, MAX_WINDOW) if ok is None else ok):
            return "this looks like a top-up or payment action"
    return None


def hook():
    try:
        reason = check(json.load(sys.stdin))
    except Exception as e:  # fail closed
        reason = f"guard crashed ({e!r}); Max must fix or reinstall the guard script"
    if reason:
        sys.stderr.write(MSG % reason)
        sys.exit(2)


# ---- Max-only CLI ----

def need_tty():
    if not (sys.stdin.isatty() and sys.stdout.isatty()):
        sys.exit("Refused: this must be run by Max, by hand, in a real terminal.")
    STATE.mkdir(mode=0o700, parents=True, exist_ok=True)


def month_total():
    ym, total = time.strftime("%Y-%m"), 0.0
    if LEDGER.exists():
        for line in LEDGER.read_text().splitlines():
            e = json.loads(line)
            if e["ts"].startswith(ym):
                total += e["usd"]
    return total


def digest(secret, salt):
    return hashlib.pbkdf2_hmac("sha256", secret.encode(), salt, ITERS)


def secret_ok(prompt="Override secret: "):
    s = json.loads(SECRET.read_text())
    return hmac.compare_digest(digest(getpass.getpass(prompt), bytes.fromhex(s["salt"])).hex(), s["hash"])


def set_secret():
    need_tty()
    if SECRET.exists() and not secret_ok("Current secret: "):
        sys.exit("Wrong secret.")
    a = getpass.getpass("New override secret (12+ chars, never tell Claude): ")
    if len(a) < 12 or a != getpass.getpass("Again: "):
        sys.exit("Too short or mismatch. Nothing changed.")
    salt = os.urandom(16)
    SECRET.write_text(json.dumps({"salt": salt.hex(), "hash": digest(a, salt).hex()}))
    SECRET.chmod(0o600)
    print("Secret set. Only a salted hash is stored.")


def approve():
    need_tty()
    account = input("Account to top up (e.g. fal): ").strip()
    usd = float(input("Amount in USD: "))
    if not account or usd <= 0:
        sys.exit("Need an account and a positive amount.")
    total = month_total()
    over = total + usd > CAP
    print(f"This month so far: ${total:.2f}. After this: ${total + usd:.2f}. Cap: ${CAP:.0f}.")
    if over:
        if not SECRET.exists():
            sys.exit("Over the cap and no override secret is set. Refused. (set-secret first)")
        if not secret_ok():
            sys.exit("Wrong secret. Refused.")
    hours = float(input("Keep the window open for how many hours? (Enter = 0.25, max 24): ") or 0.25)
    if not 0 < hours * 3600 <= MAX_WINDOW:
        sys.exit("The window must be more than 0 and at most 24 hours. Refused.")
    if input(f"Type APPROVE to let Claude top up {account} by ${usd:.2f} in the next {hours:g} hours: ") != "APPROVE":
        sys.exit("Not approved.")
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    with LEDGER.open("a") as f:
        f.write(json.dumps({"ts": ts, "account": account, "usd": usd, "over_cap": over}) + "\n")
    APPROVAL.write_text(json.dumps({"expires": time.time() + hours * 3600, "account": account, "usd": usd}))
    print(f"Approved. Window closes in {hours:g} hours. Tell Claude the account and amount.")


def unlock():
    need_tty()
    if input("Type UNLOCK to let Claude edit the guard's files and hook for 30 minutes: ") != "UNLOCK":
        sys.exit("Still locked.")
    UNLOCK.write_text(json.dumps({"expires": time.time() + UNLOCK_WINDOW}))
    print("Unlocked for 30 minutes. Top-ups still need 'approve'.")


def status():
    print(f"This month: ${month_total():.2f} of ${CAP:.0f}")
    print("Top-up window:", "OPEN" if window_open(APPROVAL, MAX_WINDOW) else "closed")
    print("Guard editing:", "UNLOCKED" if window_open(UNLOCK, UNLOCK_WINDOW) else "locked")
    print("Override secret:", "set" if SECRET.exists() else "NOT set")


def test():
    B = lambda c: {"tool_name": "Bash", "tool_input": {"command": c}}
    nav = lambda u: {"tool_name": "mcp__Claude_Browser__navigate", "tool_input": {"url": u}}
    click = lambda s: {"tool_name": "mcp__claude-in-chrome__computer",
                       "tool_input": {"action": "left_click", "ref": "ref_3", "action_summary": s}}
    settings = os.path.expanduser("~/.claude/settings.json")
    money = [
        B("curl -X POST https://api.example.com/v1/billing/topup -d amount=50"),
        B("curl https://x.io/account/add-funds"),
        B("curl -X POST https://api.example.com/v1/billing/credits --json '{\"amount\":50}'"),
        nav("https://checkout.stripe.com/c/pay/cs_live_abc"),
        click("Clicks Add credits"),
        click("Pays $50 with the saved card"),
        {"tool_name": "mcp__aws-api__call_aws", "tool_input": {"cli_command": "aws ec2 purchase-reserved-instances-offering"}},
    ]
    selfish = [
        B("python3 ~/.claude/guards/topup-guard.py approve"),
        B("jq '.disableAllHooks=true' ~/.claude/settings.json"),
        {"tool_name": "Edit", "tool_input": {"file_path": str(STATE / "ledger.jsonl"), "old_string": "a", "new_string": "b"}},
        {"tool_name": "Read", "tool_input": {"file_path": str(STATE / "secret.json")}},
        {"tool_name": "Edit", "tool_input": {"file_path": "/repo/plugin/hooks/spend_guard.py", "old_string": "a", "new_string": "b"}},
        {"tool_name": "Edit", "tool_input": {"file_path": settings, "old_string": "x topup-guard.py y", "new_string": ""}},
        {"tool_name": "Write", "tool_input": {"file_path": settings, "content": "{}"}},
    ]
    allowed = [
        B("curl https://fal.run/fal-ai/flux/schnell -d '{\"prompt\":\"a rose\"}'"),
        B("curl -s https://api.example.com/v1/billing/balance"),
        B("grep -rn 'top up' src/ && grep billing notes.md"),
        B("ls -la"),
        nav("https://fal.ai/dashboard/billing"),
        nav("https://fal.ai/models"),
        click("Opens the Billing page"),
        click("Opens the usage chart"),
        click("Clicks Pay on the localhost:3000 test checkout"),
        click("Clicks Buy credits on myapp.test"),
        {"tool_name": "mcp__Claude_Browser__get_page_text", "tool_input": {}},
        {"tool_name": "Edit", "tool_input": {"file_path": "/tmp/notes.md", "old_string": "a", "new_string": "top up the account"}},
        {"tool_name": "Edit", "tool_input": {"file_path": settings, "old_string": '"theme": "dark"', "new_string": '"theme": "light"'}},
        {"tool_name": "Agent", "tool_input": {"prompt": "explain how top-ups work"}},
    ]
    for c in money + selfish:
        assert check(c, ok=False, unlocked=False), f"should block: {c}"
    for c in allowed:
        assert check(c, ok=False, unlocked=False) is None, f"should allow: {c}"
    for c in money:
        assert check(c, ok=True, unlocked=False) is None, f"approval should allow: {c}"
        assert check(c, ok=False, unlocked=True), f"unlock must not allow money: {c}"
    for c in selfish:
        assert check(c, ok=True, unlocked=False), f"approval must not open guard files: {c}"
        assert check(c, ok=False, unlocked=True) is None, f"unlock should allow: {c}"
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        w = Path(d) / "w.json"
        for seconds, want in ((3600, True), (-5, False), (MAX_WINDOW + 3600, False)):
            w.write_text(json.dumps({"expires": time.time() + seconds}))
            assert window_open(w, MAX_WINDOW) is want, f"window {seconds}s should be {want}"
    s = os.urandom(16)
    assert digest("correct horse", s) == digest("correct horse", s) != digest("wrong", s)
    print(f"ok: {len(money)} money + {len(selfish)} self-protection blocked, {len(allowed)} allowed")


if __name__ == "__main__":
    {"approve": approve, "unlock": unlock, "set-secret": set_secret, "status": status, "test": test}.get(
        sys.argv[1] if len(sys.argv) > 1 else "", hook)()
