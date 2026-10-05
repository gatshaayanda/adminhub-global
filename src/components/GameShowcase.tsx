"use client";

import { useEffect, useState } from "react";

type Game = {
  number: string;
  title: string;
  type: string;
  href: string;
  video?: string;
  summary: string;
};

const games: Game[] = [
  {
    number: "01",
    title: "Wardrobe",
    type: "Interactive experience",
    href: "https://admin-hub-games.vercel.app/",
    video: "/video/games/wardrobe.mp4",
    summary:
      "Wardrobe is where character looks and actions can be experimented with — a playable space for testing how characters present, move and behave before those ideas are carried into wider game experiences.",
  },
  {
    number: "02",
    title: "Shooters Trigger",
    type: "Playable paintball experience",
    href: "https://admin-hub-games.vercel.app/",
    video: "/video/games/ahgames.mp4",
    summary:
      "Shooters Trigger is an action system that can be replicated and adapted for other game genres. Its playable foundation explores how responsive movement, aiming, encounters and action loops can become reusable building blocks for new games.",
  },
  {
    number: "03",
    title: "President's Shoes",
    type: "Interactive story",
    href: "https://admin-hub-games.vercel.app/",
    video: "/video/games/president.mp4",
    summary:
      "President's Shoes is a baseline for consequential storytelling — an experiment in building interactive stories where choices, actions and their consequences can shape how the experience unfolds.",
  },
  {
    number: "04",
    title: "Hall",
    type: "Interactive world",
    href: "https://admin-hub-games.vercel.app/",
    video: "/video/games/hall.mp4",
    summary:
      "Hall kick-started world exploration and shared online note taking: a foundation for interactive spaces where people can move through a world, discover context and contribute to a shared experience together.",
  },
];

export default function GameShowcase() {
  const [selected, setSelected] = useState<Game | null>(null);

  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [selected]);

  return (
    <>
      <div className="admin-project-showcase">
        {games.map((game) => (
          <button
            key={game.title}
            className="ah-project-card"
            type="button"
            onClick={() => setSelected(game)}
            aria-label={"Open " + game.title + " game preview"}
          >
            <span className="ah-project-card-media">
              {game.video ? (
                <video src={game.video} muted loop playsInline preload="metadata" aria-hidden="true" />
              ) : (
                <span className="ah-project-card-poster" aria-hidden="true" />
              )}
              <span className="ah-project-card-overlay">
                <span>Preview</span>
                <span>↗</span>
              </span>
            </span>
            <span className="ah-project-card-copy">
              <span className="admin-project-number">{game.number}</span>
              <span className="ah-project-card-title">{game.title}</span>
              <span className="ah-project-card-type">{game.type}</span>
              <span className="ah-project-card-action">
                Open preview <span>↗</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="ah-project-modal" role="dialog" aria-modal="true" aria-labelledby="game-modal-title">
          <button
            className="ah-project-modal-backdrop"
            type="button"
            aria-label="Close game preview"
            onClick={() => setSelected(null)}
          />
          <div className="ah-project-modal-panel">
            <div className="ah-project-modal-media">
              {selected.video ? (
                <video src={selected.video} controls autoPlay muted playsInline preload="metadata" />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#fff", fontSize: "14px", fontWeight: 700 }}>
                  Game video will be added here.
                </div>
              )}
            </div>
            <div className="ah-project-modal-content">
              <div>
                <p className="admin-kicker">{selected.number} / GAME</p>
                <h2 id="game-modal-title">{selected.title}</h2>
                <p className="ah-project-modal-type">{selected.type}</p>
                <p className="ah-project-modal-summary">{selected.summary}</p>
              </div>
              <div className="ah-project-modal-actions">
                <a className="admin-primary-button" href={selected.href} target="_blank" rel="noreferrer">
                  Open game <span>↗</span>
                </a>
                <button className="admin-text-link" type="button" onClick={() => setSelected(null)}>
                  Close preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
