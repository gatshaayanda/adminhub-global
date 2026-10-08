"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { productIndustries, publicProducts, type PublicProduct } from "@/data/publicProducts";

function ProjectRow({ project, onOpen }: { project: PublicProduct; onOpen: (project: PublicProduct) => void }) {
  return (
    <button type="button" className="admin-problem-project" onClick={() => onOpen(project)}>
      <span className="admin-problem-project-media" aria-hidden="true">
        {project.video ? (
          <video src={project.video} muted loop playsInline preload="metadata" />
        ) : project.image ? (
          <img src={project.image} alt="" />
        ) : null}
      </span>
      <span className="admin-problem-project-main">
        <span className="admin-problem-project-meta">
          <span>{project.status}</span>
          <span>{project.number}</span>
        </span>
        <strong>{project.title}</strong>
        <span>{project.type}</span>
      </span>
      <span className="admin-problem-project-action">Open preview <span>↗</span></span>
    </button>
  );
}

export default function IndustryProjectShowcase() {
  const [openIndustry, setOpenIndustry] = useState<string | null>(null);
  const [selected, setSelected] = useState<PublicProduct | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  return (
    <>
      <div className="admin-problems-list">
        {productIndustries.map((industry, index) => {
          const projects = industry.slugs
            .map((slug) => publicProducts.find((project) => project.slug === slug))
            .filter(Boolean) as PublicProduct[];
          const isOpen = openIndustry === industry.name;

          return (
            <section key={industry.name} className={"admin-problem-group" + (isOpen ? " is-open" : "")}>
              <button
                type="button"
                className="admin-problem-toggle"
                aria-expanded={isOpen}
                onClick={() => setOpenIndustry(isOpen ? null : industry.name)}
              >
                <span className="admin-problem-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="admin-problem-heading">
                  <span className="admin-problem-label">INDUSTRY</span>
                  <strong>{industry.name}</strong>
                </span>
                <span className="admin-problem-summary">{industry.intro}</span>
                <span className="admin-problem-open">{isOpen ? "Close" : "Open projects"} <span>{isOpen ? "↑" : "↘"}</span></span>
              </button>

              {isOpen && (
                <div className="admin-problem-projects">
                  {projects.map((project) => (
                    <ProjectRow key={project.slug} project={project} onOpen={setSelected} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {selected && (
        <div className="admin-client-modal" role="dialog" aria-modal="true" aria-labelledby="client-preview-title">
          <button type="button" className="admin-client-modal-backdrop" aria-label="Close preview" onClick={() => setSelected(null)} />
          <div className="admin-client-modal-panel">
            <div className="admin-client-modal-media">
              {selected.video ? (
                <video src={selected.video} controls autoPlay muted playsInline preload="metadata" />
              ) : selected.youtubeUrl ? (
                <iframe
                  src={"https://www.youtube.com/embed/" + selected.youtubeUrl.split("v=")[1] + "?autoplay=1&rel=0"}
                  title={selected.title + " video"}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : selected.image ? (
                <img src={selected.image} alt={selected.title + " preview"} />
              ) : null}
            </div>
            <div className="admin-client-modal-content">
              <button ref={closeButtonRef} type="button" className="admin-client-modal-close" onClick={() => setSelected(null)} aria-label="Close preview">
                Close <span>×</span>
              </button>
              <div className="admin-client-modal-copy">
                <p className="admin-client-modal-kicker">{selected.industry} · {selected.status}</p>
                <h2 id="client-preview-title">{selected.title}</h2>
                <p className="admin-client-modal-type">{selected.type}</p>
                <p className="admin-client-modal-detail">{selected.detail}</p>
                <div className="admin-client-modal-role"><span>ADMIN HUB WORK</span><strong>{selected.role}</strong></div>
                <div className="admin-client-modal-tags">{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
              </div>
              <div className="admin-client-modal-actions">
                <a href={selected.href} target="_blank" rel="noreferrer" className="admin-primary-button">
                  Open live project <span>↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
