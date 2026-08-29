"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck } from "lucide-react";
import styles from "./FounderCommandCenterMature.module.css";

type Operations = {
  generatedAt: string;
  attention: {
    newRequests: number;
    followUpsDue: number;
    unreadReplies: number;
    exceptions: number;
    identityConflicts: number;
  };
  metrics: {
    activePlayers: number;
    reviewsForming: number;
    reviewsReady: number;
    notSeenRecently: number;
  };
};

type Adoption = {
  googleLinkedProfiles: number;
  googleSubjectMappings: number;
  googlePlayerMappings: number;
  mappingMismatch: number;
  mappingHealth: "aligned" | "check_required";
  meaning: string;
};

type ActionItem = {
  key: string;
  count: number;
  title: string;
  explanation: string;
  next: string;
  href: string;
  severity: "attention" | "critical";
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const body = await response.json() as { ok?: boolean; error?: string } & T;
  if (!response.ok || body.ok === false) throw new Error(body.error ?? "Founder data could not be loaded.");
  return body;
}

export default function FounderCommandCenterDecisionBrief() {
  const [operations, setOperations] = useState<Operations | null>(null);
  const [adoption, setAdoption] = useState<Adoption | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      readJson<{ operations: Operations }>("/api/admin/boardsignal/operations"),
      readJson<{ adoption: Adoption }>("/api/admin/boardsignal/identity-adoption"),
    ]).then(([operationsBody, adoptionBody]) => {
      if (!active) return;
      setOperations(operationsBody.operations);
      setAdoption(adoptionBody.adoption);
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : "Founder data could not be loaded.");
    });
    return () => { active = false; };
  }, []);

  const actions = useMemo<ActionItem[]>(() => {
    if (!operations) return [];
    const { attention } = operations;
    return [
      {
        key: "identity",
        count: attention.identityConflicts,
        title: "Ownership cases",
        explanation: "A Google-authenticated person is asking for a Chess.com profile that already belongs to another BoardSignal identity.",
        next: "Verify the ownership evidence. Do not merge or reassign accounts automatically.",
        href: "/admin/players",
        severity: "critical" as const,
      },
      {
        key: "exceptions",
        count: attention.exceptions,
        title: "Players needing Review or system check",
        explanation: "This count is affected players, not a raw error-event total. A player has an unresolved system exception or a required Review check.",
        next: "Open the affected player, read the stated exception, then resolve the underlying Review/system state rather than dismissing the counter.",
        href: "/admin/exceptions",
        severity: "critical" as const,
      },
      {
        key: "replies",
        count: attention.unreadReplies,
        title: "Unread player replies",
        explanation: "A player has replied in a Founder-visible conversation.",
        next: "Read and answer the reply, then leave the thread in its truthful read state.",
        href: "/admin/communications",
        severity: "attention" as const,
      },
      {
        key: "followups",
        count: attention.followUpsDue,
        title: "Follow-ups due",
        explanation: "A player has reached a normal Founder follow-up point.",
        next: "Open Player operations, contact them, then use Mark Contacted or Snooze so the queue reflects what you actually did.",
        href: "#founder-live-operations",
        severity: "attention" as const,
      },
      {
        key: "requests",
        count: attention.newRequests,
        title: "Legacy requests waiting",
        explanation: "A legacy request still needs Founder handling. Normal Patch K onboarding is Google-first and does not wait for Founder approval.",
        next: "Open the request and handle only the identity/legacy work it actually requires.",
        href: "/admin/players",
        severity: "attention" as const,
      },
    ].filter((item) => item.count > 0);
  }, [operations]);

  if (!operations || !adoption) {
    return (
      <section className={styles.decisionBrief} aria-label="Founder decision brief">
        <div className={styles.loadingBrief}><LoaderCircle size={18} /> {error || "Loading operational truth…"}</div>
      </section>
    );
  }

  const raised = actions.reduce((sum, action) => sum + action.count, 0);
  const generated = new Date(operations.generatedAt);
  const generatedLabel = Number.isNaN(generated.getTime()) ? "current materialized state" : generated.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <section className={styles.decisionBrief} aria-labelledby="founder-decision-heading">
      <div className={styles.briefHeader}>
        <div>
          <span className={styles.eyebrow}>Founder overview</span>
          <h2 id="founder-decision-heading">What is happening, and what should I do?</h2>
          <p>Use this first. The deeper Command Center below is for investigation and operations, not for making you decode raw counters.</p>
        </div>
        <div className={raised > 0 ? styles.statusAttention : styles.statusGood}>
          {raised > 0 ? <CircleAlert size={18} /> : <CheckCircle2 size={18} />}
          <span>{raised > 0 ? `${raised} action signals across ${actions.length} area${actions.length === 1 ? "" : "s"}` : "Nothing currently needs Founder action"}</span>
        </div>
      </div>

      <div className={styles.adoptionGrid} aria-label="Account adoption and identity health">
        <article>
          <span>Google-linked profiles</span>
          <strong>{adoption.googleLinkedProfiles}</strong>
          <p>Persisted Google ↔ Chess.com return mappings. This is the useful claim/adoption number, not Google login attempts.</p>
        </article>
        <article>
          <span>Active BoardSignals</span>
          <strong>{operations.metrics.activePlayers}</strong>
          <p>Current active player accounts in Founder operational truth.</p>
        </article>
        <article>
          <span>Ownership cases</span>
          <strong>{operations.attention.identityConflicts}</strong>
          <p>Cases that need human ownership verification before any identity decision.</p>
        </article>
        <article>
          <span>Google mapping health</span>
          <strong className={adoption.mappingMismatch > 0 ? styles.valueAttention : styles.valueGood}>
            {adoption.mappingMismatch > 0 ? `${adoption.mappingMismatch} check` : "Aligned"}
          </strong>
          <p>{adoption.mappingMismatch > 0 ? "Google subject and Chess.com player mapping counts do not match. Inspect identity records before treating adoption totals as complete." : "Google subject mappings and Chess.com player mappings are paired at the aggregate level."}</p>
        </article>
      </div>

      <div className={styles.actionBrief}>
        <div className={styles.actionBriefHeading}>
          <div>
            <span className={styles.eyebrow}>Needs you</span>
            <h3>{actions.length ? "Resolve these in this order." : "No intervention queue right now."}</h3>
          </div>
          <span className={styles.freshness}>Updated {generatedLabel}</span>
        </div>

        {actions.length ? (
          <div className={styles.actionList}>
            {actions.map((action) => (
              <article key={action.key} className={action.severity === "critical" ? styles.actionCritical : styles.actionAttention}>
                <div className={styles.actionCount}>{action.count}</div>
                <div>
                  <h4>{action.title}</h4>
                  <p>{action.explanation}</p>
                  <strong>Next: {action.next}</strong>
                </div>
                <Link href={action.href}>Open <ArrowRight size={15} /></Link>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.clearState}><ShieldCheck size={20} /><div><strong>Operational state is clear.</strong><p>You can focus on product QA, player conversations and growth instead of repairing the system.</p></div></div>
        )}
      </div>

      <div className={styles.deletionNote}>
        <ShieldCheck size={17} />
        <p><strong>Deleted/test accounts:</strong> a completed BoardSignal account deletion removes that player’s Founder summary, active exception records and identity mappings. Deleted players should therefore disappear from these operational counts. If a player you know you deleted still appears, treat that as a data-hygiene problem to inspect — do not simply ignore the counter.</p>
      </div>
    </section>
  );
}
