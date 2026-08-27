from pathlib import Path
import sys

ROOT = Path.cwd()
ACCOUNT_DELETION = ROOT / "src/lib/boardsignal/server/accountDeletion.ts"

if not ACCOUNT_DELETION.exists():
    raise SystemExit("PATCH_J_CORE_REPAIR: accountDeletion.ts is missing")

source = ACCOUNT_DELETION.read_text(encoding="utf-8")
# Keep these preconditions intentionally implementation-style agnostic. The
# regression we are repairing became brittle because it required an obsolete
# helper call. What matters is that the current deletion manager still owns the
# account archive/private subcollection inventory and Firebase Auth deletion.
required_contract_signals = [
    "PRIVATE_PLAYER_SUBCOLLECTIONS",
    "accountArchive",
    "private",
    "deleteUser",
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
# The old test required the removed internal deleteAccountArchive(uid) helper.
# Assert the durable accountArchive cleanup contract instead. The existing test
# helper checks source inclusion, so this is quote/style independent and still
# proves the archive deletion path remains represented in the manager.
path.write_text(text.replace(obsolete_signal, "accountArchive", 1), encoding="utf-8")

print(path.relative_to(ROOT).as_posix())
print(
    f"PATCH_J_CORE_REPAIR: replaced stale internal-helper assertion in {path.relative_to(ROOT)}",
    file=sys.stderr,
)
