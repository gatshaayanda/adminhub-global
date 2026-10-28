"use client";

import Link from "next/link";
import GameShowcase from "@/components/GameShowcase";
import IndustryProjectShowcase from "@/components/IndustryProjectShowcase";
import AdminHubSignal from "@/components/AdminHubSignal";

export default function HomePage() {
  return (
    <div className="admin-home">
      <section className="admin-start" id="start">
        <div className="admin-start-copy">
          <AdminHubSignal />
          <p className="admin-kicker mt-5">ADMIN HUB / START HERE</p>
          <h1>Digital Business Tools &amp; Interactive Experiences.</h1>
          <p className="admin-start-lead">
            Start with the information you already have. Whether you run a business
            or work with businesses as a referral or sales partner, tell us what
            you are trying to achieve and we can take the next step with you.
          </p>
          <div className="admin-start-actions">
            <Link className="admin-primary-button admin-primary-button-large" href="/contact">
              I represent a business <span>↗</span>
            </Link>
            <Link className="admin-text-link" href="/partners">
              I want to partner with Admin Hub ↗
            </Link>
          </div>
          <p className="admin-start-lead" style={{fontSize:"15px", marginTop:"24px"}}>
            Already have a company profile, website or social page? Share the material
            you have and explain the problem you want solved. We aim to understand the
            real workflow first, not make you repeat everything in a long questionnaire.
          </p>
        </div>
      </section>

      <section className="admin-hero" id="capability">
        <div className="admin-hero-copy-block">
          <p className="admin-kicker">01 / SEE HOW THE WORK GETS BUILT</p>
          <h2>From a real problem to a working tool.</h2>
          <p className="admin-hero-lead">
            A look at the process, tools, business systems and interactive experiences
            behind Admin Hub.
          </p>
          <p className="admin-section-lead">
            Since 2020, more than 1,000 code commits have recorded the steps involved
            in building, connecting, fixing, testing and improving software. Think of
            them like the many recorded stages of building a house: they are evidence
            of repeated work, not 1,000 separate apps.
          </p>
        </div>
        <div className="admin-hero-video">
          <video src="/video/admin-ad.mp4" autoPlay muted loop playsInline preload="metadata" aria-label="Admin Hub development process and project showreel" />
          <div className="admin-video-label"><span>ADMIN HUB / SHOWREEL</span><span>BUILD · TEST · IMPROVE</span></div>
        </div>
      </section>

      <section className="admin-work admin-problems" id="work">
        <div className="admin-section-intro">
          <p className="admin-kicker">02 / CASE STUDIES & PROJECT EXAMPLES</p>
          <h2>Real business needs.<br />Purpose-built tools.</h2>
          <p className="admin-section-lead">
            These examples show how a reusable foundation is adapted to different
            businesses and their real-world workflows. Open a case study to see the
            tool and visit the project. Where a business has agreed to act as a reference, you can contact them
            independently about their experience with Admin Hub and its founder.
            We only present genuine references with permission; a project example is
            not automatically a testimonial or endorsement.
          </p>
        </div>
        <IndustryProjectShowcase />
      </section>

      <section className="admin-work admin-games" id="games">
        <div className="admin-section-intro">
          <p className="admin-kicker">03 / INTERACTIVE EXPERIENCES</p>
          <h2>Playful ideas.<br />Real interaction.</h2>
          <p className="admin-section-lead">
            Games and interactive experiences are part of the same product-building
            practice: design the interaction, make it work on real devices, test it,
            and improve it. These can support entertainment, learning, discovery or
            a business-specific customer experience.
          </p>
          <div className="admin-hero-actions">
            <Link className="admin-primary-button" href="/games">Explore all games <span>↗</span></Link>
          </div>
        </div>
        <GameShowcase />
      </section>

      <section className="admin-start" id="founder">
        <div className="admin-start-copy">
          <p className="admin-kicker">04 / MEET THE FOUNDER</p>
          <h2>Get to know the person behind the work.</h2>
          <p className="admin-start-lead">
            Explore the founder profile and supporting records, then decide what
            questions you want to ask. The case studies show the work; the profile
            provides more background on the person building it.
          </p>
          <div className="admin-start-actions">
            <Link className="admin-primary-button admin-primary-button-large" href="/ayanda">
              Meet the founder <span>↗</span>
            </Link>
            <Link className="admin-text-link" href="/contact">Discuss a project ↗</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
