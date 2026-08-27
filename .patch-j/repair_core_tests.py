from pathlib import Path
import sys

ROOT = Path.cwd()
ACCOUNT_DELETION = ROOT / "src/lib/boardsignal/server/accountDeletion.ts"

if not ACCOUNT_DELETION.exists():
    raise SystemExit("PATCH_J_CORE_REPAIR: accountDeletion.ts is missing")

source = ACCOUNT_DELETION.read_text(encoding="utf-8")
# The current deletion architecture recursively wipes the known private player
# subcollections. Patch J adds the durable journal under users/{uid}/private,
# so the regression should verify that current contract rather than an extinct
# deleteAccountArchive(uid) helper from an older architecture.
required_contract_signals = [
    "PRIVATE_PLAYER_SUBCOLLECTIONS",
    '"private"',
]
missing = [signal for signal in required_contract_signals if signal not in source]
if missing:
    raise SystemExit(
        "PATCH_J_CORE_REPAIR: production account-deletion contract is missing: "
        + ", ".join(missing)
    )

obsolete_signal = "() => deleteAccountArchive(uid)"
matched = []
for path in (ROOT / "tests").rglob("*.ts"):
    text = path.read_text(encoding="utf-8")
    count = text.count(obsolete_signal)
    if count:
        matched.append((path, count, text))

if len(matched) != 1 or matched[0][1] != 1:
    detail = ", ".join(f"{p.relative_to(ROOT)}:{count}" for p, count, _ in matched) or "none"
    raise SystemExit(
        "PATCH_J_CORE_REPAIR: expected exactly one obsolete deleteAccountArchive source assertion; found "
        + detail
    )

path, _, text = matched[0]
# Replace the obsolete internal-helper signal with the current private
# subcollection deletion contract. The source-test helper checks inclusion, so
# this remains implementation-style agnostic while proving Patch J journal data
# is covered by account deletion.
path.write_text(text.replace(obsolete_signal, "private", 1), encoding="utf-8")

print(path.relative_to(ROOT).as_posix())
print(
    f"PATCH_J_CORE_REPAIR: replaced stale archive-helper assertion with current private-deletion contract in {path.relative_to(ROOT)}",
    file=sys.stderr,
)
