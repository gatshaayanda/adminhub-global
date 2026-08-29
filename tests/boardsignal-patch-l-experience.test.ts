import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("Patch L homepage has one obvious Google-first access path and no beta-password or public username entry", () => {
  const page = read("src/app/page.tsx");
  const gateway = read("src/components/UsernameDeskForm.tsx");

  assert.match(page, /THE CHESS APP THAT REVIEWS YOUR WEEK/);
  assert.match(page, /BoardSignal is an installable chess performance app|It is an app/);
  assert.doesNotMatch(page, /ChessComLoginPanel/);
  assert.doesNotMatch(page, /FoundingBetaAccessPanel/);
  assert.match(gateway, /Start or return with Google/);
  assert.match(gateway, /Continue with Google/);
  assert.match(gateway, /never type your Gmail password into BoardSignal/);
  assert.doesNotMatch(gateway, /OR EXPLORE THE PUBLIC UNIVERSE/);
  assert.doesNotMatch(gateway, /public-universe-username-form/);
});

test("Patch L Google entry returns existing players before asking new players for Chess.com profile connection", () => {
  const gateway = read("src/components/UsernameDeskForm.tsx");
  assert.match(gateway, /action: "return"/);
  assert.match(gateway, /GOOGLE_ACCESS_NOT_LINKED/);
  assert.match(gateway, /router\.replace\("\/boardsignal\/player-room\?source=google&tab=desk"\)/);
  assert.match(gateway, /GOOGLE SIGN-IN COMPLETE/);
  assert.match(gateway, /Now connect your Chess\.com profile/);
  assert.match(gateway, /This is profile connection, not Chess\.com login/);
});

test("Patch L install experience is obvious, optional, discoverable and cross-platform", () => {
  const prompt = read("src/components/InstallPrompt.tsx");
  const styles = read("src/components/BoardSignalInstallPrompt.module.css");
  assert.match(prompt, /beforeinstallprompt/);
  assert.match(prompt, /event\.preventDefault\(\)/);
  assert.match(prompt, /appinstalled/);
  assert.match(prompt, /display-mode: standalone/);
  assert.match(prompt, /ADD BOARDSIGNAL TO YOUR HOME SCREEN/);
  assert.match(prompt, /INSTALL BOARDSIGNAL/);
  assert.match(prompt, /NOT NOW/);
  assert.match(prompt, /Tap Share/);
  assert.match(prompt, /Tap Add to Home Screen/);
  assert.match(prompt, /pathname === "\/"/);
  assert.match(styles, /prefers-reduced-motion/);
});

test("Patch L uses restrained motion and truthful animated product metrics", () => {
  const metrics = read("src/components/BoardSignalLiveProof.tsx");
  const motion = read("src/app/boardsignal-experience.css");
  assert.match(metrics, /prefers-reduced-motion: reduce/);
  assert.match(metrics, /requestAnimationFrame/);
  assert.match(metrics, /IntersectionObserver/);
  assert.match(metrics, /Real BoardSignal activity only/);
  assert.match(motion, /prefers-reduced-motion: no-preference/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(motion, /infinite/);
});
