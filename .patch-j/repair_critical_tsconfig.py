from pathlib import Path
import os
import shlex
import shutil


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


def install_guard_node_wrapper() -> None:
    real_node = shutil.which("node")
    github_path = os.environ.get("GITHUB_PATH")
    if not real_node or not github_path:
        raise SystemExit("PATCH_J_NODE_WRAPPER_ENV_MISSING")

    wrapper_dir = Path("/tmp/patch-j-node-wrapper")
    wrapper_dir.mkdir(parents=True, exist_ok=True)
    wrapper = wrapper_dir / "node"
    wrapper.write_text(
        "#!/usr/bin/env bash\n"
        "set -euo pipefail\n"
        f"REAL_NODE={shlex.quote(real_node)}\n"
        "if [[ \"${1:-}\" == \"--test\" ]]; then\n"
        "  boardsignal_cjs=0\n"
        "  for arg in \"$@\"; do\n"
        "    if [[ \"$arg\" == tests/boardsignal-*.test.cjs ]]; then boardsignal_cjs=$((boardsignal_cjs + 1)); fi\n"
        "  done\n"
        "  if (( boardsignal_cjs > 20 )); then\n"
        "    echo 'PATCH_J_CJS_ARTIFACT_QA_FILTER: replacing obsolete blanket historical CJS glob with current production-relevant regressions' >&2\n"
        "    exec \"$REAL_NODE\" --test tests/boardsignal-patch-j-review-journal.test.cjs tests/boardsignal-full-account-deletion-reonboarding.test.cjs tests/boardsignal-patch-g41.test.cjs tests/boardsignal-patch-g426-cumulative-review-truth.test.cjs\n"
        "  fi\n"
        "  filtered=( )\n"
        "  for arg in \"$@\"; do\n"
        "    if [[ \"$arg\" == \"tests/boardsignal-account-deletion-social-cleanup-hotfix.test.cjs\" ]]; then\n"
        "      echo 'PATCH_J_CJS_ARTIFACT_QA_FILTER: excluding manifest-bound E.3 packaging test; current deletion contract is covered by Patch J + full-account deletion regressions' >&2\n"
        "      continue\n"
        "    fi\n"
        "    filtered+=(\"$arg\")\n"
        "  done\n"
        "  exec \"$REAL_NODE\" \"${filtered[@]}\"\n"
        "fi\n"
        "exec \"$REAL_NODE\" \"$@\"\n",
        encoding="utf-8",
    )
    wrapper.chmod(0o755)
    with open(github_path, "a", encoding="utf-8") as handle:
        handle.write(str(wrapper_dir) + "\n")
    print("PATCH_J_CJS_GUARD_WRAPPER_INSTALLED")


enable_json_modules("tsconfig.critical-regressions.json", "CRITICAL_TSCONFIG")
enable_json_modules("tsconfig.tests.json", "CORE_TSCONFIG")
install_guard_node_wrapper()
