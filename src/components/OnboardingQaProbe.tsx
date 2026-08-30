"use client";

import { useEffect } from "react";

function inspectReadableBox(root: HTMLElement, issues: string[], prefix: string) {
  const rootRect = root.getBoundingClientRect();
  if (rootRect.left < -1 || rootRect.right > window.innerWidth + 1) issues.push(`${prefix}-outside-viewport`);

  for (const element of root.querySelectorAll<HTMLElement>("h1,h2,h3,p,label,button,a,summary,strong,small,input,select,span")) {
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = element.getBoundingClientRect();
    const text = (element.textContent ?? "").trim();
    if (text.length >= 10 && rect.width > 0 && rect.width < 38) {
      issues.push(`${prefix}-collapsed-text:${element.tagName.toLowerCase()}:${Math.round(rect.width)}`);
      break;
    }
    if (element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 3 && style.overflowX !== "auto" && style.overflowX !== "scroll") {
      issues.push(`${prefix}-element-overflow:${element.tagName.toLowerCase()}`);
      break;
    }
  }
}

export default function OnboardingQaProbe({ theme }: { theme: "light" | "dark" }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    const timer = window.setTimeout(() => {
      const result = document.getElementById("boardsignal-onboarding-qa-result");
      const host = document.getElementById("boardsignal-onboarding-qa-host");
      const card = document.querySelector<HTMLElement>("[data-boardsignal-onboarding-card]");
      const proof = document.querySelector<HTMLElement>("[data-boardsignal-home-proof]");
      const preview = document.querySelector<HTMLElement>("[data-boardsignal-qa-preview]");
      const issues: string[] = [];

      if (!result || !host || !card || !proof || !preview) return;
      result.dataset.viewportWidth = String(window.innerWidth);
      result.dataset.viewportHeight = String(window.innerHeight);
      result.dataset.theme = theme;

      if (document.documentElement.scrollWidth > window.innerWidth + 2) {
        issues.push(`page-overflow:${document.documentElement.scrollWidth}>${window.innerWidth}`);
      }

      const cardRect = card.getBoundingClientRect();
      const minimumUsefulWidth = Math.min(260, Math.max(180, window.innerWidth - 48));
      if (cardRect.width < minimumUsefulWidth) issues.push(`card-too-narrow:${Math.round(cardRect.width)}`);

      if (window.innerWidth >= 981) {
        const previewRect = preview.getBoundingClientRect();
        for (const [name, element] of [["onboarding", card], ["proof", proof]] as const) {
          const rect = element.getBoundingClientRect();
          const verticallyOverlaps = rect.top < previewRect.bottom && rect.bottom > previewRect.top;
          if (verticallyOverlaps && rect.right > previewRect.left + 1) issues.push(`${name}-overlaps-example-review`);
        }
      }

      inspectReadableBox(card, issues, "onboarding");
      inspectReadableBox(proof, issues, "proof");

      const passed = issues.length === 0;
      result.dataset.result = passed ? "pass" : "fail";
      result.textContent = passed ? "BOARD_SIGNAL_ONBOARDING_RENDER_PASS" : `BOARD_SIGNAL_ONBOARDING_RENDER_FAIL:${issues.join(",")}`;
    }, 450);

    return () => window.clearTimeout(timer);
  }, [theme]);

  return <output id="boardsignal-onboarding-qa-result" data-result="checking" aria-live="polite">BOARD_SIGNAL_ONBOARDING_RENDER_CHECKING</output>;
}
