"use client";

import { useEffect } from "react";
import type { BoardSignalCoachingPresentation } from "@/lib/boardsignal/account";

type Theme = "light" | "dark";
type Level = 1 | 2 | 3;

type Rgba = { r: number; g: number; b: number; a: number };

function parseColor(value: string): Rgba | undefined {
  const match = value.match(/rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (!match) return undefined;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) };
}

function effectiveBackground(element: HTMLElement): Rgba {
  let node: HTMLElement | null = element;
  while (node) {
    const color = parseColor(window.getComputedStyle(node).backgroundColor);
    if (color && color.a >= .999) return color;
    node = node.parentElement;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
}

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
}

function luminance(color: Rgba) {
  return .2126 * channel(color.r) + .7152 * channel(color.g) + .0722 * channel(color.b);
}

function contrast(element: HTMLElement) {
  const foreground = parseColor(window.getComputedStyle(element).color);
  if (!foreground) return 0;
  const background = effectiveBackground(element);
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + .05) / (darker + .05);
}

function coachingFor(level: Level): BoardSignalCoachingPresentation {
  const example = {
    id: "qa-game-1:forcing-reply",
    gameId: "qa-game-1",
    gameUrl: "https://www.chess.com/game/live/1",
    summary: "QA real example text stays readable inside the Level 3 evidence surface.",
  };
  return {
    schemaVersion: 2,
    coachingSignalKey: "m7:2026-08-31:current:forcing_reply",
    periodStart: "2026-08-31",
    periodEnd: "2026-09-06",
    family: "forcing_reply",
    source: "current_week",
    provenance: "current_period",
    level,
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
    hold: level >= 3,
  } as BoardSignalCoachingPresentation;
}

export default function PlayerRoomCoachingQaProbe({ theme, level }: { theme: Theme; level: Level }) {
  useEffect(() => {
    document.documentElement.dataset.bsTheme = theme;
    document.documentElement.style.colorScheme = theme;
    const coaching = coachingFor(level);
    let attempts = 0;
    let settled = false;

    const inspect = () => {
      if (settled) return true;
      const result = document.getElementById("boardsignal-m8-player-room-qa-result");
      const target = document.querySelector<HTMLElement>(".g3-before-next-game");
      const progressive = document.querySelectorAll<HTMLElement>('[aria-label="Progressive coaching explanation"]');
      if (!result || !target || progressive.length !== 1) return false;
      const root = progressive[0];
      const issues: string[] = [];
      const levelOneCount = [...root.querySelectorAll("span")].filter((node) => node.textContent?.startsWith("LEVEL 1 ·")).length;
      const levelTwoCount = root.querySelectorAll('[aria-label="Coaching level 2"]').length;
      const levelThreeCount = root.querySelectorAll('[aria-label="Coaching level 3"]').length;
      const expectedLevelOne = level === 1 ? 1 : 0;
      const expectedLevelTwo = level === 2 ? 1 : 0;
      const expectedLevelThree = level === 3 ? 1 : 0;
      if (progressive.length !== 1) issues.push(`progressive:${progressive.length}`);
      if (levelOneCount !== expectedLevelOne) issues.push(`level1:${levelOneCount}`);
      if (levelTwoCount !== expectedLevelTwo) issues.push(`level2:${levelTwoCount}`);
      if (levelThreeCount !== expectedLevelThree) issues.push(`level3:${levelThreeCount}`);
      if (levelOneCount + levelTwoCount + levelThreeCount !== 1) issues.push(`active-levels:${levelOneCount + levelTwoCount + levelThreeCount}`);

      const feedbackButtons = [...root.querySelectorAll<HTMLButtonElement>('button[aria-label^="Level "]')];
      const feedbackRows = new Set(feedbackButtons.map((button) => button.parentElement)).size;
      if (feedbackRows !== 1 || feedbackButtons.length !== 2) issues.push(`feedback-rows:${feedbackRows}:buttons:${feedbackButtons.length}`);

      const nativeTitle = target.querySelector<HTMLElement>(":scope > h3");
      const nativeCopy = target.querySelector<HTMLElement>(":scope > p");
      if (!nativeTitle || contrast(nativeTitle) < 4.5) issues.push(`native-title-contrast:${nativeTitle ? contrast(nativeTitle).toFixed(2) : "missing"}`);
      if (!nativeCopy || contrast(nativeCopy) < 4.5) issues.push(`native-copy-contrast:${nativeCopy ? contrast(nativeCopy).toFixed(2) : "missing"}`);

      let levelOneContrast: number | undefined;
      if (level === 1) {
        const provenance = root.querySelector<HTMLElement>("small");
        levelOneContrast = provenance ? contrast(provenance) : 0;
        if (!provenance || levelOneContrast < 4.5) issues.push(`level1-contrast:${levelOneContrast.toFixed(2)}`);
      }

      let levelTwoContrast: number | undefined;
      if (level === 2) {
        const levelTwoBody = root.querySelector<HTMLElement>('[aria-label="Coaching level 2"] > p');
        levelTwoContrast = levelTwoBody ? contrast(levelTwoBody) : 0;
        if (!levelTwoBody || levelTwoContrast < 4.5) issues.push(`level2-contrast:${levelTwoContrast.toFixed(2)}`);
      }

      let levelThreeContrast: number | undefined;
      let levelThreeGameValid: boolean | undefined;
      let levelThreeAskAvailable: boolean | undefined;
      if (level === 3) {
        const levelThree = root.querySelector<HTMLElement>('[aria-label="Coaching level 3"]');
        const exampleText = levelThree ? [...levelThree.querySelectorAll<HTMLElement>("p")].find((node) => node.textContent?.includes("QA real example text")) : undefined;
        levelThreeContrast = exampleText ? contrast(exampleText) : 0;
        if (!exampleText || levelThreeContrast < 4.5) issues.push(`level3-contrast:${levelThreeContrast.toFixed(2)}`);
        const gameLink = levelThree?.querySelector<HTMLAnchorElement>('a[href="https://www.chess.com/game/live/1"]');
        levelThreeGameValid = Boolean(gameLink && gameLink.textContent?.includes("VIEW GAME"));
        if (!levelThreeGameValid) issues.push("level3-game:missing");
        levelThreeAskAvailable = Boolean([...root.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("ASK BOARDSIGNAL")));
        if (!levelThreeAskAvailable) issues.push("level3-ask:missing");
      }

      for (const button of feedbackButtons) {
        const rect = button.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 48) {
          issues.push(`thumb-target:${Math.round(rect.width)}x${Math.round(rect.height)}`);
          break;
        }
      }

      if (document.documentElement.scrollWidth > window.innerWidth + 2) issues.push(`page-overflow:${document.documentElement.scrollWidth}>${window.innerWidth}`);
      const rootRect = root.getBoundingClientRect();
      if (rootRect.left < -1 || rootRect.right > window.innerWidth + 1) issues.push(`coaching-outside-viewport:${Math.round(rootRect.left)}:${Math.round(rootRect.right)}`);

      result.dataset.theme = theme;
      result.dataset.level = String(level);
      result.dataset.viewportWidth = String(window.innerWidth);
      result.dataset.feedbackRows = String(feedbackRows);
      if (levelOneContrast !== undefined) result.dataset.level1Contrast = levelOneContrast.toFixed(2);
      if (levelTwoContrast !== undefined) result.dataset.level2Contrast = levelTwoContrast.toFixed(2);
      if (levelThreeContrast !== undefined) result.dataset.level3Contrast = levelThreeContrast.toFixed(2);
      if (levelThreeGameValid !== undefined) result.dataset.level3GameValid = String(levelThreeGameValid);
      if (levelThreeAskAvailable !== undefined) result.dataset.level3AskAvailable = String(levelThreeAskAvailable);
      result.dataset.result = issues.length ? "fail" : "pass";
      result.textContent = issues.length ? `BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_FAIL:${issues.join(",")}` : "BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_PASS";
      settled = true;
      return true;
    };

    const inject = () => {
      window.dispatchEvent(new CustomEvent("boardsignal:coaching-state", { detail: coaching }));
    };

    inject();
    const timer = window.setInterval(() => {
      attempts += 1;
      // QA-only hold: Firebase has no authenticated player on this local route and may
      // clear the production component state after our synthetic coaching event.
      // Keep the fixture state present until CDP has completed its measurement.
      inject();
      if (!settled) window.requestAnimationFrame(() => { inspect(); });
      if (attempts >= 60 && !settled) {
        window.clearInterval(timer);
        const result = document.getElementById("boardsignal-m8-player-room-qa-result");
        if (result) {
          result.dataset.result = "fail";
          result.textContent = "BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_FAIL:coaching-did-not-render";
        }
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [level, theme]);

  return <output id="boardsignal-m8-player-room-qa-result" data-result="checking" aria-live="polite">BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_CHECKING</output>;
}