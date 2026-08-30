"use client";

import { useEffect } from "react";

export default function OnboardingQaProbe({ theme }: { theme: "light" | "dark" }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    const timer = window.setTimeout(() => {
      const result = document.getElementById("boardsignal-onboarding-qa-result");
      const host = document.getElementById("boardsignal-onboarding-qa-host");
      const card = document.querySelector<HTMLElement>("[data-boardsignal-onboarding-card]");
      const preview = document.querySelector<HTMLElement>("[data-boardsignal-qa-preview]");
      const issues: string[] = [];

      if (!result || !host || !card || !preview) return;
      result.dataset.viewportWidth = String(window.innerWidth);
      result.dataset.viewportHeight = String(window.innerHeight);
      result.dataset.theme = theme;

      if (document.documentElement.scrollWidth > window.innerWidth + 2) {
        issues.push(`page-overflow:${document.documentElement.scrollWidth}>${window.innerWidth}`);
      }

      const cardRect = card.getBoundingClientRect();
      const minimumUsefulWidth = Math.min(260, Math.max(180, window.innerWidth - 48));
      if (cardRect.width < minimumUsefulWidth) issues.push(`card-too-narrow:${Math.round(cardRect.width)}`);
      if (cardRect.left < -1 || cardRect.right > window.innerWidth + 1) issues.push("card-outside-viewport");

      if (window.innerWidth >= 981) {
        const previewRect = preview.getBoundingClientRect();
        const verticallyOverlaps = cardRect.top < previewRect.bottom && cardRect.bottom > previewRect.top;
        if (verticallyOverlaps && cardRect.right > previewRect.left + 1) issues.push("onboarding-overlaps-example-review");
      }

      for (const element of card.querySelectorAll<HTMLElement>("h1,h2,h3,p,label,button,a,summary,strong,small,input,select")) {
        const style = window.getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const rect = element.getBoundingClientRect();
        const text = (element.textContent ?? "").trim();
        if (text.length >= 10 && rect.width > 0 && rect.width < 38) {
          issues.push(`collapsed-text:${element.tagName.toLowerCase()}:${Math.round(rect.width)}`);
          break;
        }
        if (element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 3 && style.overflowX !== "auto" && style.overflowX !== "scroll") {
          issues.push(`element-overflow:${element.tagName.toLowerCase()}`);
          break;
        }
      }

      const passed = issues.length === 0;
      result.dataset.result = passed ? "pass" : "fail";
      result.textContent = passed ? "BOARD_SIGNAL_ONBOARDING_RENDER_PASS" : `BOARD_SIGNAL_ONBOARDING_RENDER_FAIL:${issues.join(",")}`;
    }, 350);

    return () => window.clearTimeout(timer);
  }, [theme]);

  return <output id="boardsignal-onboarding-qa-result" data-result="checking" aria-live="polite">BOARD_SIGNAL_ONBOARDING_RENDER_CHECKING</output>;
}
