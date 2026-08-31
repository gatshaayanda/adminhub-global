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
      if (settled) return;
      const result = document.getElementById("boardsignal-m8-player-room-qa-result");
      const target = document.querySelector<HTMLElement>(".g3-before-next-game");
      const progressive = document.querySelectorAll<HTMLElement>('[aria-label="Progressive coaching explanation"]');
      if (!result || !target || progressive.length !== 1) return false;
      const root = progressive[0];
      const issues: string[] = [];
      const levelOneCount = [...root.querySelectorAll("span")].filter((node) => node.textContent?.startsWith("LEVEL 1 ·")).length;
      const levelTwoCount = root.querySelectorAll('[aria-label="Coaching level 2"]').length;
      const levelThreeCount = root.querySelectorAll('[aria-label="Coaching level 3"]').length;
      if (progressive.length !== 1) issues.push(`progressive:${progressive.length}`);
      if (levelOneCount !== 1) issues.push(`level1:${levelOneCount}`);
      if (levelTwoCount !== (level >= 2 ? 1 : 0)) issues.push(`level2:${levelTwoCount}`);
      if (levelThreeCount !== (level >= 3 ? 1 : 0)) issues.push(`level3:${levelThreeCount}`);

      const nativeTitle = target.querySelector<HTMLElement>(":scope > h3");
      const nativeCopy = target.querySelector<HTMLElement>(":scope > p");
      if (!nativeTitle || contrast(nativeTitle) < 4.5) issues.push(`native-title-contrast:${nativeTitle ? contrast(nativeTitle).toFixed(2) : "missing"}`);
      if (!nativeCopy || contrast(nativeCopy) < 4.5) issues.push(`native-copy-contrast:${nativeCopy ? contrast(nativeCopy).toFixed(2) : "missing"}`);

      let levelTwoContrast: number | undefined;
      if (level >= 2) {
        const levelTwoBody = root.querySelector<HTMLElement>('[aria-label="Coaching level 2"] > p');
        levelTwoContrast = levelTwoBody ? contrast(levelTwoBody) : 0;
        if (!levelTwoBody || levelTwoContrast < 4.5) issues.push(`level2-contrast:${levelTwoContrast.toFixed(2)}`);
      }

      let levelThreeContrast: number | undefined;
      if (level >= 3) {
        const levelThree = root.querySelector<HTMLElement>('[aria-label="Coaching level 3"]');
        const exampleText = levelThree ? [...levelThree.querySelectorAll<HTMLElement>("p")].find((node) => node.textContent?.includes("QA real example text")) : undefined;
        levelThreeContrast = exampleText ? contrast(exampleText) : 0;
        if (!exampleText || levelThreeContrast < 4.5) issues.push(`level3-contrast:${levelThreeContrast.toFixed(2)}`);
      }

      for (const button of root.querySelectorAll<HTMLButtonElement>('button[aria-label^="Level "]')) {
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
      if (levelTwoContrast !== undefined) result.dataset.level2Contrast = levelTwoContrast.toFixed(2);
      if (levelThreeContrast !== undefined) result.dataset.level3Contrast = levelThreeContrast.toFixed(2);
      result.dataset.result = issues.length ? "fail" : "pass";
      result.textContent = issues.length ? `BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_FAIL:${issues.join(",")}` : "BOARD_SIGNAL_M8_PLAYER_ROOM_RENDER_PASS";
      settled = true;
      return true;
    };

    const timer = window.setInterval(() => {
      attempts += 1;
      window.dispatchEvent(new CustomEvent("boardsignal:coaching-state", { detail: coaching }));
      window.requestAnimationFrame(() => {
        if (inspect()) window.clearInterval(timer);
      });
      if (attempts >= 30 && !settled) {
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
