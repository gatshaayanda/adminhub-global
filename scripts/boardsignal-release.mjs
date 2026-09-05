#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PRODUCTION_BRANCH = "boardsignal-v10";
const RELEASE_WORKFLOW_NAME = "BoardSignal Release Guard";

function fail(message) {
  console.error(`BOARD_SIGNAL_RELEASE_FAIL: ${message}`);
  process.exit(1);
}

function note(message) {
  console.log(`BOARD_SIGNAL_RELEASE: ${message}`);
}

function run(file, args, { inherit = false, allowFailure = false } = {}) {
  try {
    return execFileSync(file, args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
    }) ?? "";
  } catch (error) {
    if (allowFailure) return "";
    const stderr = typeof error?.stderr === "string" ? error.stderr.trim() : "";
    fail(`${file} ${args.join(" ")} failed${stderr ? `: ${stderr}` : ""}`);
  }
}

function runShell(command) {
  try {
    execSync(command, { cwd: ROOT, stdio: "inherit", shell: true });
  } catch {
    fail(`local check failed: ${command}`);
  }
}

function git(...args) {
  return run("git", args).trim();
}

function requireCleanTree() {
  const dirty = git("status", "--porcelain=v1");
  if (dirty) fail(`working tree is not clean:\n${dirty}`);
}

function requireNoGitOperation() {
  const gitDir = git("rev-parse", "--git-dir");
  const markers = ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "rebase-apply", "rebase-merge"];
  for (const marker of markers) {
    if (fs.existsSync(path.resolve(ROOT, gitDir, marker))) fail(`Git operation in progress: ${marker}`);
  }
}

function fetchProduction() {
  run("git", ["fetch", "origin", PRODUCTION_BRANCH, "--quiet"]);
}

function headSha() {
  return git("rev-parse", "HEAD");
}

function currentBranch() {
  return git("branch", "--show-current");
}

function productionSha() {
  return git("rev-parse", `origin/${PRODUCTION_BRANCH}`);
}

function manifestPath(value) {
  if (!value) fail("carriage manifest is required, for example V1-R1 or docs/boardsignal/carriages/V1-R1.json");
  if (value.endsWith(".json")) return path.resolve(ROOT, value);
  return path.resolve(ROOT, "docs", "boardsignal", "carriages", `${value}.json`);
}

function loadManifest(value) {
  const file = manifestPath(value);
  if (!fs.existsSync(file)) fail(`carriage manifest not found: ${path.relative(ROOT, file)}`);
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    fail(`carriage manifest is not valid JSON: ${path.relative(ROOT, file)}`);
  }
  if (!/^V1-[A-Z0-9.]+$/.test(String(manifest.id ?? ""))) fail("manifest.id must look like V1-R1, V1-M1 or V1-UX1");
  if (!/^[0-9a-f]{40}$/.test(String(manifest.baselineSha ?? ""))) fail("manifest.baselineSha must be a full 40-character commit SHA");
  if (!Array.isArray(manifest.allowedPaths) || manifest.allowedPaths.length === 0) fail("manifest.allowedPaths must be a non-empty array");
  if (!Array.isArray(manifest.localChecks)) fail("manifest.localChecks must be an array");
  return { manifest, file };
}

function changedFiles(baseSha) {
  const output = git("diff", "--name-only", baseSha, "HEAD");
  return output ? output.split(/\r?\n/).filter(Boolean) : [];
}

function requireAncestor(baseSha) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", baseSha, "HEAD"], { cwd: ROOT, stdio: "ignore" });
  } catch {
    fail(`candidate HEAD does not descend from manifest baseline ${baseSha}`);
  }
}

function scope(manifestArg, suppliedBase) {
  const { manifest, file } = loadManifest(manifestArg);
  const baseSha = suppliedBase ?? manifest.baselineSha;
  if (baseSha !== manifest.baselineSha) fail(`manifest baseline ${manifest.baselineSha} does not match supplied base ${baseSha}`);
  requireAncestor(baseSha);
  run("git", ["diff", "--check", baseSha, "HEAD"], { inherit: true });

  const changed = changedFiles(baseSha);
  if (!changed.length) fail("candidate has no changes relative to its baseline");
  const allowed = new Set(manifest.allowedPaths);
  const unexpected = changed.filter((fileName) => !allowed.has(fileName));
  if (unexpected.length) fail(`candidate changed paths outside the carriage manifest:\n${unexpected.join("\n")}`);

  const relativeManifest = path.relative(ROOT, file).replaceAll("\\", "/");
  if (!changed.includes(relativeManifest)) fail(`candidate must change its carriage manifest: ${relativeManifest}`);
  if (manifest.packageLock === "unchanged" && changed.includes("package-lock.json")) fail("package-lock.json changed but the carriage contract requires it unchanged");

  note(`${manifest.id} scope PASS`);
  note(`baseline ${baseSha}`);
  note(`candidate ${headSha()}`);
  changed.forEach((fileName) => console.log(`  ${fileName}`));
  return manifest;
}

function preflight() {
  requireNoGitOperation();
  requireCleanTree();
  fetchProduction();
  const branch = currentBranch();
  if (branch !== PRODUCTION_BRANCH) fail(`preflight must start on ${PRODUCTION_BRANCH}; current branch is ${branch || "detached HEAD"}`);
  const local = headSha();
  const remote = productionSha();
  if (local !== remote) fail(`local ${PRODUCTION_BRANCH} ${local} does not equal origin/${PRODUCTION_BRANCH} ${remote}`);
  note(`GIT PREFLIGHT PASS · baseline ${local}`);
  note("Now verify Vercel Production is READY on this same SHA before mutation. Use: vercel list --prod && vercel inspect <production-deployment>");
}

function prove(manifestArg, suppliedBase) {
  const manifest = scope(manifestArg, suppliedBase);
  for (const command of manifest.localChecks) {
    note(`running ${command}`);
    runShell(command);
  }
  note(`${manifest.id} LOCAL PROOF PASS`);
}

function matchingCiRun(branch, sha) {
  const raw = run("gh", [
    "run", "list",
    "--branch", branch,
    "--commit", sha,
    "--limit", "30",
    "--json", "databaseId,headSha,status,conclusion,url,workflowName,name",
  ]);
  let runs;
  try { runs = JSON.parse(raw); } catch { fail("could not parse GitHub CLI workflow output"); }
  return runs.find((item) => item.headSha === sha && (item.workflowName === RELEASE_WORKFLOW_NAME || item.name === RELEASE_WORKFLOW_NAME));
}

function watchCi(branchArg) {
  const branch = branchArg ?? currentBranch();
  const sha = headSha();
  const runInfo = matchingCiRun(branch, sha);
  if (!runInfo) fail(`no ${RELEASE_WORKFLOW_NAME} run found yet for ${branch} at ${sha}`);
  note(`watching CI run ${runInfo.databaseId}`);
  run("gh", ["run", "watch", String(runInfo.databaseId), "--exit-status", "--compact"], { inherit: true });
  note("AUTHORITATIVE CI PASS");
}

function requireCiPass(branch, sha) {
  const runInfo = matchingCiRun(branch, sha);
  if (!runInfo) fail(`no release-guard run found for ${branch} at ${sha}`);
  if (runInfo.status !== "completed" || runInfo.conclusion !== "success") {
    fail(`release guard is not green: status=${runInfo.status} conclusion=${runInfo.conclusion ?? "pending"}`);
  }
}

function findDeployment(shaArg) {
  const sha = shaArg ?? headSha();
  note(`READY Vercel deployments for ${sha}`);
  run("vercel", ["ls", "-m", `githubCommitSha=${sha}`, "--status", "READY"], { inherit: true });
}

function land(manifestArg, deployment) {
  if (!deployment) fail("land requires the exact READY Vercel deployment URL or ID as the second argument");
  requireNoGitOperation();
  requireCleanTree();
  fetchProduction();

  const { manifest } = loadManifest(manifestArg);
  const branch = currentBranch();
  if (branch === PRODUCTION_BRANCH) fail("land must run from the proved candidate branch, not boardsignal-v10");
  const candidate = headSha();
  const remoteProduction = productionSha();
  if (remoteProduction !== manifest.baselineSha) {
    fail(`production branch moved since the carriage was based: expected ${manifest.baselineSha}, found ${remoteProduction}`);
  }
  scope(manifestArg, manifest.baselineSha);
  requireCiPass(branch, candidate);

  const inspect = run("vercel", ["inspect", deployment]);
  process.stdout.write(inspect);
  const shortSha = candidate.slice(0, 7);
  if (!inspect.includes(candidate) && !inspect.includes(shortSha)) {
    fail(`Vercel deployment inspection did not identify candidate SHA ${candidate}; refusing promotion`);
  }
  if (!/READY/i.test(inspect)) fail("Vercel deployment is not READY; refusing production mutation");

  note(`fast-forwarding ${PRODUCTION_BRANCH} to ${candidate}`);
  run("git", ["push", "origin", `${candidate}:refs/heads/${PRODUCTION_BRANCH}`], { inherit: true });
  note(`promoting exact Vercel deployment ${deployment}`);
  run("vercel", ["promote", deployment, "--yes"], { inherit: true });
  run("vercel", ["promote", "status"], { inherit: true, allowFailure: true });
  note(`LAND COMPLETE · candidate ${candidate}`);
  note("Final gate: re-run npm run bs:preflight from boardsignal-v10 and verify Vercel Production reports this same SHA.");
}

function help() {
  console.log(`BoardSignal post-V1 release harness\n\nCommands:\n  preflight\n  scope <V1-Rx|manifest.json> [baseSha]\n  prove <V1-Rx|manifest.json> [baseSha]\n  watch-ci [candidate-branch]\n  find-deployment [sha]\n  land <V1-Rx|manifest.json> <vercel-deployment-url-or-id>\n`);
}

const [command, ...args] = process.argv.slice(2);
switch (command) {
  case "preflight": preflight(); break;
  case "scope": scope(args[0], args[1]); break;
  case "prove": prove(args[0], args[1]); break;
  case "watch-ci": watchCi(args[0]); break;
  case "find-deployment": findDeployment(args[0]); break;
  case "land": land(args[0], args[1]); break;
  case "help":
  case "--help":
  case "-h":
  case undefined: help(); break;
  default: fail(`unknown command: ${command}`);
}
