"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";
import { boardSignalPresentationLabel } from "@/lib/boardsignal/presentationLanguage";
import type { PlayerPulse } from "@/lib/boardsignal/pulse";
import { ArrowRight, Radio, Target, TrendingUp } from "lucide-react";
import {
  publicTopThree,
  type PlayerUniverseView,
  type UniverseCategoryGroup,
} from "@/lib/boardsignal/universe";

type AuthenticatedUniverseContextValue = {
  pulse?: PlayerPulse;
  unavailable?: string;
};

const AuthenticatedUniverseContext = createContext<AuthenticatedUniverseContextValue | null>(null);

export function AuthenticatedUniverseProvider({
  pulse,
  unavailable,
  children,
}: AuthenticatedUniverseContextValue & { children: ReactNode }) {
  return <AuthenticatedUniverseContext.Provider value={{ pulse, unavailable }}>{children}</AuthenticatedUniverseContext.Provider>;
}

export function UniverseCategoryCards({ groups }: { groups: UniverseCategoryGroup[] }) {
  return (
    <div className="universe-category-grid">
      {groups.map((group) => (
        <article className="universe-category-card" id={`universe-${group.id}`} key={group.id}>
          <div className="universe-category-heading">
            <span>CURRENT OFFICIAL LEADERS</span>
            <h2>{group.title}</h2>
            <p>{group.description}</p>
          </div>
          {group.boards.length ? group.boards.map((board) => (
            <div className="universe-board" key={board.key}>
              <div className="universe-board-scope-row">{board.scopeLabel ? <p className="universe-scope">{board.scopeLabel}</p> : <span />}{"fieldLabel" in board ? <small className="universe-field-label">{boardSignalPresentationLabel(String((board as typeof board & { fieldLabel?: string }).fieldLabel ?? ""))}</small> : null}</div>
              <ol>
                {publicTopThree(board).map((item) => (
                  <li key={item.participantId}>
                    <span>{item.rank}</span>
                    <div><strong>{item.player}</strong><small>{item.evidence}</small></div>
                    <b>{item.valueLabel}</b>
                    {item.coverageHref ? <Link href={item.coverageHref} aria-label={`Open positive highlight for ${item.player}`}><ArrowRight size={16} /></Link> : null}
                  </li>
                ))}
              </ol>
              {board.entries.length < 3 ? <p className="universe-field-note">More players are joining · {board.entries.length} comparable completed review{board.entries.length === 1 ? "" : "s"}.</p> : null}
            </div>
          )) : <div className="universe-empty"><Radio size={18} /><p>{group.emptyMessage}</p></div>}
        </article>
      ))}
    </div>
  );
}

function AuthenticatedReviewUniverse({ pulse, unavailable }: AuthenticatedUniverseContextValue) {
  if (!pulse) {
    return <section className="universal-section private-universe-section g4-around-review g4-universe-unavailable" id="standing"><div className="universal-section-heading"><span>U</span><div><p className="kicker">AROUND THIS REVIEW</p><h2>Around this Review is temporarily unavailable.</h2><p>{unavailable ?? "Your completed Review remains unchanged. BoardSignal is not substituting an older static field."}</p></div></div></section>;
  }

  const strongest = [...pulse.standings].sort((a, b) => a.rank - b.rank || b.denominator - a.denominator).slice(0, 3);
  return <section className="universal-section private-universe-section g4-around-review" id="standing">
    <div className="universal-section-heading"><span>U</span><div><p className="kicker">AROUND THIS REVIEW · OFFICIAL</p><h2>Where this completed Review stands now.</h2><p>Uses the same official field as Around BoardSignal. Current-week comparisons remain private and provisional until the Review closes.</p></div></div>
    <div className="founding-field-note g4-live-field-note"><TrendingUp size={18} /><div><strong>LIVE FIELD</strong><p>{pulse.officialPlayerCount} player{pulse.officialPlayerCount === 1 ? "" : "s"} represented by their latest eligible completed Review.</p></div></div>
    {strongest.length ? <div className="private-standing-list g4-official-position-grid">{strongest.map((standing) => <article key={`${standing.categoryId}:${standing.scopeLabel ?? "all"}`}><div><span>{standing.categoryTitle}{standing.scopeLabel ? ` · ${standing.scopeLabel}` : ""}</span><strong>#{standing.rank} of {standing.denominator}</strong><p>{standing.valueLabel}</p></div><b>OFFICIAL</b>{standing.nearestAbove ? <small>In reach: {standing.nearestAbove.player} · {standing.nearestAbove.valueLabel}</small> : <small>{standing.rank === 1 ? "Leading this current official board." : "Based on completed Review evidence."}</small>}</article>)}</div> : <div className="universe-empty"><p>No official board position yet. This Review has not met a current comparison category&apos;s minimum evidence.</p></div>}
    {pulse.reviewMovement.length ? <div className="g4-around-review-movement"><p className="kicker">PREVIOUS REVIEW → CURRENT REVIEW</p>{pulse.reviewMovement.slice(0, 3).map((card) => <article key={card.id}><strong>{card.title}</strong><p>{card.body}</p></article>)}</div> : null}
  </section>;
}

export function PrivateUniverseSections({ view }: { view: PlayerUniverseView }) {
  const authenticated = useContext(AuthenticatedUniverseContext);
  if (authenticated) return <AuthenticatedReviewUniverse pulse={authenticated.pulse} unavailable={authenticated.unavailable} />;

  return (
    <>
      <section className="universal-section private-universe-section" id="standing">
        <div className="universal-section-heading"><span>U</span><div><p className="kicker">AROUND BOARDSIGNAL</p><h2>Where your completed week stands.</h2></div></div>
        <div className="founding-field-note"><TrendingUp size={18} /><div><strong>{boardSignalPresentationLabel(view.fieldLabel)}</strong><p>{view.fieldDescription}</p></div></div>
        {view.standings.length ? (
          <div className="private-standing-list">
            {view.standings.map((standing) => (
              <article key={`${standing.categoryId}:${standing.scopeLabel ?? "all"}`}>
                <div>
                  <span>{standing.categoryTitle}{standing.scopeLabel ? ` · ${standing.scopeLabel}` : ""}</span>
                  <strong>{standing.denominator >= 3 ? `#${standing.rank} of ${standing.denominator}` : "Comparison field forming"}</strong>
                  <p>{standing.valueLabel}{standing.percentile !== undefined ? ` · ${standing.percentile}th percentile` : ""}</p>
                </div>
                {standing.label ? <b>{standing.label}</b> : <b>{standing.denominator} comparable</b>}
                {standing.nearestAbove ? <small>In reach: {standing.nearestAbove.player} · {standing.nearestAbove.valueLabel}</small> : <small>{standing.rank === 1 && standing.denominator >= 3 ? "Leading this approved field." : "More completed reviews will make this comparison stronger."}</small>}
              </article>
            ))}
          </div>
        ) : <div className="universe-empty"><p>This review is valid, but its available facts do not yet meet a comparison category&apos;s minimum sample. No standing has been invented.</p></div>}
      </section>

      <section className="universal-section universe-learning-section">
        <div className="universal-section-heading"><span><Target size={16} /></span><div><p className="kicker">THIS WEEK&apos;S STANDOUTS</p><h2>Top performances to learn from.</h2></div></div>
        {view.learningLeaders.length ? <div className="universe-learning-grid">
          {view.learningLeaders.map((leader) => (
            <Link href={leader.coverageHref} key={`${leader.categoryId}:${leader.player}`}>
              <span>#1 {leader.categoryTitle}{leader.scopeLabel ? ` · ${leader.scopeLabel}` : ""}</span>
              <h3>{leader.player}</h3>
              <strong>{leader.valueLabel}</strong>
              <p>{leader.coverageHeadline}</p>
              <small>Open highlight <ArrowRight size={14} /></small>
            </Link>
          ))}
        </div> : <div className="universe-empty"><p>The relevant approved comparison field is still forming.</p></div>}
        <Link href="/feed" className="universe-explore-link">Explore Around BoardSignal <ArrowRight size={16} /></Link>
      </section>
    </>
  );
}
