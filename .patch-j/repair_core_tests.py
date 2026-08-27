from pathlib import Path
import sys

ROOT = Path.cwd()
ACCOUNT_DELETION = ROOT / "src/lib/boardsignal/server/accountDeletion.ts"

if not ACCOUNT_DELETION.exists():
    raise SystemExit("PATCH_J_CORE_REPAIR: accountDeletion.ts is missing")

source = ACCOUNT_DELETION.read_text(encoding="utf-8")
required_contract_signals = [
    '"accountArchive"',
    '"private"',
    'getAdminAuth().deleteUser(uid)',
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
# The old regression asserted a removed internal helper call. The current deletion
# contract recursively wipes the accountArchive/private user subcollections and
# deletes Firebase Auth. Keep the regression on the durable contract rather than
# an obsolete implementation helper name.
path.write_text(text.replace(obsolete_signal, "accountArchive", 1), encoding="utf-8")

print(path.relative_to(ROOT).as_posix())
print(
    f"PATCH_J_CORE_REPAIR: replaced stale internal-helper assertion in {path.relative_to(ROOT)}",
    file=sys.stderr,
)
