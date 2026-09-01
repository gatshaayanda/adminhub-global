"use client";

import { useEffect } from "react";
import type { BoardSignalCoachingPresentation } from "@/lib/boardsignal/account";

type Theme = "light" | "dark";
type Variant = 1 | 2 | 3;
type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgba | undefined {
  const match = value.match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (!match) return undefined;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) };
}
function effectiveBackground(element: HTMLElement): Rgba { let node: HTMLElement | null = element; while (node) { const color = parseColor(window.getComputedStyle(node).backgroundColor); if (color && color.a >= .999) return color; node = node.parentElement; } return { r: 255, g: 255, b: 255, a: 1 }; }
function channel(value: number) { const normalized = value / 255; return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4; }
function luminance(color: Rgba) { return .2126 * channel(color.r) + .7152 * channel(color.g) + .0722 * channel(color.b); }
function contrast(element: HTMLElement) { const foreground = parseColor(window.getComputedStyle(element).color); if (!foreground) return 0; const background = effectiveBackground(element); const lighter = Math.max(luminance(foreground), luminance(background)); const darker = Math.min(luminance(foreground), luminance(background)); return (lighter + .05) / (darker + .05); }

function coachingFor(variant: Variant): BoardSignalCoachingPresentation {
  const example = { id: "qa-game-1:forcing-reply", gameId: "qa-game-1", gameUrl: "https://www.chess.com/game/live/1", summary: "QA real example text stays readable inside the canonical coaching presentation." };
  return {
    schemaVersion: 2,
    coachingSignalKey: "m7:2026-08-31:current:forcing_reply",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    family: "forcing_reply",
    source: "current_week",
    provenance: "current_period",
    level: variant,
    automaticVariantCursor: variant === 1 ? 2 : variant === 2 ? 3 : 1,
    cueTitle: "Check the forcing reply first.",
    cueCopy: "Before committing, scan the opponent's checks and captures.",
    level2Copy: "Put more simply: do not calculate only your own plan. First ask what the opponent can force immediately with a check or capture.",
    evidenceCount: 2,
    gamesConsidered: 4,
    reactions: {},
    examples: [example],
    selectedExampleId: example.id,
    selectedExampleSnapshot: example,
    selectedExample: example,
    presentedSessionIds: [],
    createdAt: "2026-08-31T10:00:00.000Z",
    updatedAt: "2026-08-31T10:00:00.000Z",
    hold: variant === 3,
  } as BoardSignalCoachingPresentation;
}

export default function PlayerRoomCoachingQaProbe({ theme, level }: { theme: Theme; level: Variant }) {
  useEffect(() => {
    document.documentElement.dataset.bsTheme = theme;
    document.documentElement.style.colorScheme = theme;
    const coaching = coachingFor(level);
    let attempts = 0;
    let settled = false;
    const expectedCopy = level === 1 ? coaching.cueCopy : level === 2 ? coaching.level2Copy : coaching.selectedExample?.summary;

    const inspect = () => {
      if (settled) return true;
      const result = document.getElementById("boardsignal-m8-player-room-qa-result");
      const target = document.querySelector<HTMLElement>(".g3-before-next-game");
      const controls = document.querySelectorAll<HTMLElement>('[aria-label="Coaching controls"]');
      if (!result || !target || controls.length !== 1) return false;
      const root = controls[0];
      const issues: string[] = [];
      const presentations = document.querySelectorAll<HTMLElement>(".g3-before-next-game");
      const feedback = root.querySelectorAll<HTMLElement>('[aria-label="Feedback for this coaching explanation"]');
      const nativeTitle = target.querySelector<HTMLElement>(":scope > h3");
      const nativeCopy = [...target.querySelectorAll<HTMLElement>(":scope > p")].find((node) => !node.classList.contains("corner-framing"));
      if (presentations.length !== 1) issues.push(`presentations:${presentations.length}`);
      if (controls.length !== 1) issues.push(`controls:${controls.length}`);
      if (feedback.length !== 1) issues.push(`feedback:${feedback.length}`);
      if (!nativeTitle || nativeTitle.textContent !== coaching.cueTitle) issues.push("native-title:mismatch");
      if (!nativeCopy || nativeCopy.textContent !== expectedCopy) issues.push("native-copy:mismatch");
      if (!nativeTitle || contrast(nativeTitle) < 4.5) issues.push(`native-title-contrast:${nativeTitle ? contrast(nativeTitle).toFixed(2) : "missing"}`);
      if (!nativeCopy || contrast(nativeCopy) < 4.5) issues.push(`native-copy-contrast:${nativeCopy ? contrast(nativeCopy).toFixed(2) : "missing"}`);
      if (/\bLEVEL\s*[123]\b/i.test(target.textContent ?? "")) issues.push("player-level-language");
      if (target.querySelector('[aria-label^="Coaching level"]')) issues.push("legacy-level-surface");
      if (target.querySelector('[aria-label="Progressive coaching explanation"]')) issues.push("legacy-progressive-surface");
      const feedbackButtons = [...feedback[0]?.querySelectorAll<HTMLButtonElement>("button") ?? []];
      if (feedbackButtons.length !== 2) issues.push(`feedback-buttons:${feedbackButtons.length}`);
      for (const button of feedbackButtons) { const rect = button.getBoundingClientRect(); if (rect.width < 50 || rect.height < 48) { issues.push(`thumb-target:${Math.round(rect.width)}x${Math.round(rect.height)}`); break; } }
      const switchButton = [...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("TRY ANOTHER EXPLANATION"));
      if (!switchButton) issues.push("manual-switch:missing");
      if (level === 3) {
        const gameLink = root.querySelector<HTMLAnchorElement>('a[href="https://www.chess.com/game/live/1"]');
        const askButton = [...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("ASK BOARDSIGNAL ABOUT THIS"));
        if (!gameLink) issues.push("game-link:missing");
        if (!askButton) issues.push("ask:missing");
        const summaryCount = (target.textContent?.match(/QA real example text/g) ?? []).length;
        if (summaryCount !== 1) issues.push(`example-summary-count:${summaryCount}`);
      }
      if (document.documentElement.scrollWidth > window.innerWidth + 2) issues.push(`page-overflow:${document.documentElement.scrollWidth}>${window.innerWidth}`);
      const rect = target.getBoundingClientRect();
      if (rect.left < -1 || rect.right > window.innerWidth + 1) issues.push(`presentation-outside-viewport:${Math.round(rect.left)}:${Math.round(rect.right)}`);

      result.dataset.theme = theme;
      result.dataset.variant = String(level);
      result.dataset.viewportWidth = String(window.innerWidth);
      result.dataset.presentationCount = String(presentations.length);
      result.dataset.feedbackCount = String(feedback.length);
      result.dataset.titleContrast = nativeTitle ? contrast(nativeTitle).toFixed(2) : "0";
      result.dataset.copyContrast = nativeCopy ? contrast(nativeCopy).toFixed(2) : "0";
      result.dataset.result = issues.length ? "fail" : "pass";
      result.textContent = issues.length ? `BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_FAIL:${issues.join(",")}` : "BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_PASS";
      settled = true;
      return true;
    };

    const inject = () => window.dispatchEvent(new CustomEvent("boardsignal:coaching-state", { detail: coaching }));
    inject();
    const timer = window.setInterval(() => {
      attempts += 1;
      inject();
      if (!settled) window.requestAnimationFrame(() => { inspect(); });
      if (attempts >= 60 && !settled) {
        window.clearInterval(timer);
        const result = document.getElementById("boardsignal-m8-player-room-qa-result");
        if (result) { result.dataset.result = "fail"; result.textContent = "BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_FAIL:coaching-did-not-render"; }
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [level, theme]);

  return <output id="boardsignal-m8-player-room-qa-result" data-result="checking" aria-live="polite">BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_CHECKING</output>;
}
