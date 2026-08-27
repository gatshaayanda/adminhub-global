from pathlib import Path


def enable_json_modules(filename: str, label: str) -> None:
    path = Path(filename)
    text = path.read_text(encoding="utf-8")
    if '"resolveJsonModule": true' in text:
        raise SystemExit(f"PATCH_J_{label}_ALREADY_REPAIRED")
    old = '    "esModuleInterop": true,\n    "strict": true,\n'
    new = '    "esModuleInterop": true,\n    "resolveJsonModule": true,\n    "strict": true,\n'
    if text.count(old) != 1:
        raise SystemExit(f"PATCH_J_{label}_ANCHOR_MISMATCH count={text.count(old)}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"PATCH_J_{label}_REPAIRED")


enable_json_modules("tsconfig.critical-regressions.json", "CRITICAL_TSCONFIG")
enable_json_modules("tsconfig.tests.json", "CORE_TSCONFIG")
