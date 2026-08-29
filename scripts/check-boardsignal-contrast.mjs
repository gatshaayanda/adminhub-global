// Stable BoardSignal contrast-check entrypoint.
//
// Patch L keeps this filename/package contract for existing QA suites while the
// implementation delegates to the active-cascade validator. The validator
// recursively follows boardsignal-system.css and checks the semantic light,
// dark and system-dark state contracts across the actual player-facing CSS.
await import("./check-boardsignal-cascade.mjs");
