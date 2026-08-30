import { notFound } from "next/navigation";
import HomeProofRail from "@/components/HomeProofRail";
import UsernameDeskForm, { type OnboardingQaState } from "@/components/UsernameDeskForm";
import OnboardingQaProbe from "@/components/OnboardingQaProbe";
import type { PublicBoardSignalProof } from "@/lib/boardsignal/server/publicProof";
import type { PublicBoardSignalTrafficProof } from "@/lib/boardsignal/server/publicTrafficProof";
import homeStyles from "../../../page.module.css";

const states = new Set<OnboardingQaState>(["google", "username", "profile", "collision"]);
const QA_PROOF: PublicBoardSignalProof = {
  activePlayers: 87,
  playersServed: 49,
  reviewsProduced: 72,
  reviewsForming: 41,
  retentionReviews: 44,
  returningPlayers: 8,
};
const QA_TRAFFIC: PublicBoardSignalTrafficProof = {
  visitors30d: 365,
  pageviews30d: 2335,
  since: "2026-08-01",
  until: "2026-08-30",
};

type SearchParams = Promise<{ state?: string; theme?: string }>;

export default async function BoardSignalOnboardingQaPage({ searchParams }: { searchParams: SearchParams }) {
  if (process.env.NODE_ENV === "production") notFound();
  const params = await searchParams;
  const state = states.has(params.state as OnboardingQaState) ? params.state as OnboardingQaState : "google";
  const theme = params.theme === "dark" ? "dark" : "light";

  return (
    <main id="boardsignal-onboarding-qa-host" style={{ padding: "2rem 0 4rem" }}>
      <OnboardingQaProbe theme={theme} />
      <div className={`container personal-hero-grid ${homeStyles.heroGrid}`}>
        <section className={homeStyles.heroCopy} aria-label={`Onboarding QA state ${state}`}>
          <p className="kicker">LOCAL RENDER QA · {state.toUpperCase()}</p>
          <h1 style={{ marginBottom: "1rem" }}>Get My BoardSignal</h1>
          <UsernameDeskForm qaState={state} />
          <HomeProofRail proof={QA_PROOF} traffic={QA_TRAFFIC} />
        </section>
        <aside className={`player-preview pipeline-preview ${homeStyles.preview}`} data-boardsignal-qa-preview aria-label="Example Review collision boundary">
          <div className="pipeline-preview-top"><span>Example review</span><strong>34 games · 23W · 10L · 1D</strong></div>
          <div className="coverage-stat"><strong>+92</strong><span>rating</span></div>
          <p><strong>WHAT STOOD OUT</strong><br />Seven straight wins changed the week.</p>
          <p><strong>BIGGEST OPPORTUNITY</strong><br />Several losses came after good positions had already been reached.</p>
          <p><strong>FOCUS NEXT</strong><br />When you&apos;re ahead, check your opponent&apos;s forcing reply before committing.</p>
        </aside>
      </div>
    </main>
  );
}
