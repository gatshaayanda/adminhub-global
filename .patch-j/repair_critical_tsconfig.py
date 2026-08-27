from pathlib import Path

path = Path("tsconfig.critical-regressions.json")
text = path.read_text(encoding="utf-8")
if '"resolveJsonModule": true' in text:
    raise SystemExit("PATCH_J_CRITICAL_TSCONFIG_ALREADY_REPAIRED")
old = '    "esModuleInterop": true,\n    "strict": true,\n'
new = '    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "strict": true,\n'
if text.count(old) != 1:
    raise SystemExit(f"PATCH_J_CRITICAL_TSCONFIG_ANCHOR_MISMATCH count={text.count(old)}")
path.write_text(text.replace(old, new, 1), encoding="utf-8")
print("PATCH_J_CRITICAL_TSCONFIG_REPAIRED")
