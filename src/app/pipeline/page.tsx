import type { Metadata } from "next";
import FeaturePipelineClient from "@/components/FeaturePipelineClient";
import { getPublicFeaturePipelineState } from "@/lib/boardsignal/server/featurePipeline";
import "./pipeline.css";

export const revalidate = 60;
const title = "BoardSignal Pipeline — What We're Building Next";
const description = "BoardSignal V1 is live. See what has shipped, what we're building next, and give input on where BoardSignal goes from here.";
const canonical = "https://www.adminhub-global.com/pipeline";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: { title, description, url: canonical, siteName: "BoardSignal", type: "website", images: [{ url: "/pipeline/opengraph-image", width: 1200, height: 630, alt: "BoardSignal Pipeline — V1 is live. The desk keeps moving." }] },
  twitter: { card: "summary_large_image", title, description, images: ["/pipeline/opengraph-image"] },
};

export default async function PipelinePage() {
  const state = await getPublicFeaturePipelineState();
  return <div className="pipeline-page">
    <section className="pipeline-hero" aria-labelledby="pipeline-title">
      <div className="container pipeline-hero__inner">
        <p className="eyebrow">BOARD SIGNAL PIPELINE</p>
        <h1 id="pipeline-title">BoardSignal V1 is live.<br />The desk keeps moving.</h1>
        <p className="pipeline-hero__dek">See what has shipped, what we&apos;re building next, and where BoardSignal is heading — then tell us what would matter to your game.</p>
        <p className="pipeline-release-position">Founding Release · Limited Availability</p>
        <div className="pipeline-rail" aria-label="Pipeline status flow"><span>Planned</span><i aria-hidden="true" /><span>Building</span><i aria-hidden="true" /><span>Released</span></div>
      </div>
    </section>
    <div id="main" className="container pipeline-main">
      <FeaturePipelineClient initialState={state} />
      <section className="pipeline-community" aria-labelledby="community-input">
        <p className="eyebrow">COMMUNITY INPUT</p><h2 id="community-input">A signal, not a binding vote</h2>
        <p>Community interest helps shape how BoardSignal evolves. It is one signal alongside actual player use, reliability and product direction. Founder judgment still controls the roadmap.</p>
      </section>
      <section className="pipeline-follow" aria-labelledby="follow-build">
        <p className="eyebrow">FOLLOW THE BUILD</p><h2 id="follow-build">Keep up with BoardSignal</h2><p>For longer discussion, Discord is the clearest place to continue the conversation.</p>
        <div className="pipeline-socials">
          <a href="https://www.instagram.com/boardsignal?igsi=cW12eXFtMng3bHd6" target="_blank" rel="noopener noreferrer">Instagram<span aria-hidden="true">↗</span></a>
          <a href="https://discord.gg/GecXt64PEf" target="_blank" rel="noopener noreferrer">Discord<span aria-hidden="true">↗</span></a>
          <a href="https://youtube.com/@boardsignal-n1z?si=1glv1AQmcfy4ues7" target="_blank" rel="noopener noreferrer">YouTube<span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </div>
  </div>;
}
