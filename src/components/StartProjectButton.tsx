"use client";

import { ArrowUpRight } from "lucide-react";

export default function StartProjectButton() {
  const openAssistant = () => {
    window.dispatchEvent(new CustomEvent("adminhub:open-chat", { detail: { startProject: true } }));
  };

  return (
    <button type="button" className="admin-primary-button admin-primary-button-large" onClick={openAssistant}>
      Tell Admin Hub what you need <ArrowUpRight size={17} aria-hidden="true" />
    </button>
  );
}
