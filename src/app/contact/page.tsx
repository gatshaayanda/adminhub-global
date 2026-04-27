"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  FileText,
  Globe2,
  LayoutDashboard,
  LockKeyhole,
  MessageCircle,
  Network,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
  Workflow,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";

type InquiryForm = {
  name: string;
  preferredContact: string;
  role: string;
  business: string;
  country: string;
  solutionInterest: string;
  projectNeed: string;
  timeline: string;
  notes: string;
};

const INQUIRY_DRAFT_KEY = "adminhub_global_contact_inquiry_draft_v1";

const initialForm: InquiryForm = {
  name: "",
  preferredContact: "",
  role: "",
  business: "",
  country: "",
  solutionInterest: "",
  projectNeed: "",
  timeline: "",
  notes: "",
};

const solutionOptions = [
  "48-Hour Live Proof",
  "Business PWA",
  "Operations PWA",
  "Partner / Agent Access",
  "Client Hub",
  "Managed Support",
  "Proposal / PDF Tools",
  "Not sure yet",
];

const roleOptions = [
  "Client / Business Owner",
  "Agent / Sales Partner",
  "Partner / Referrer",
  "Existing Client",
  "Internal Admin / Team",
];

const timelineOptions = [
  "As soon as possible",
  "This week",
  "This month",
  "Exploring for later",
  "Not sure yet",
];

function cleanValue(value: string) {
  return value.trim();
}

function buildInquirySummary(form: InquiryForm) {
  return [
    "AdminHub Global Inquiry",
    "",
    `Name: ${form.name || "-"}`,
    `Preferred contact detail: ${form.preferredContact || "-"}`,
    `Role: ${form.role || "-"}`,
    `Business / Organisation: ${form.business || "-"}`,
    `Country / Region: ${form.country || "-"}`,
    `Solution interest: ${form.solutionInterest || "-"}`,
    `Timeline: ${form.timeline || "-"}`,
    "",
    "Project / workflow need:",
    form.projectNeed || "-",
    "",
    "Extra notes:",
    form.notes || "-",
  ].join("\n");
}

function saveDraft(form: InquiryForm) {
  try {
    localStorage.setItem(INQUIRY_DRAFT_KEY, JSON.stringify(form));
  } catch {}
}

function readDraft(): Partial<InquiryForm> | null {
  try {
    const raw = localStorage.getItem(INQUIRY_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<InquiryForm>;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(INQUIRY_DRAFT_KEY);
  } catch {}
}

export default function ContactPage() {
  const [online, setOnline] = useState(true);
  const [copiedLabel, setCopiedLabel] = useState("");
  const [form, setForm] = useState<InquiryForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const saved = readDraft();

    if (saved && typeof saved === "object") {
      setForm((prev) => ({ ...prev, ...saved }));
    }
  }, []);

  useEffect(() => {
    const updateStatus = () => setOnline(navigator.onLine);

    updateStatus();

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    saveDraft(form);
  }, [form]);

  const inquirySummary = useMemo(() => buildInquirySummary(form), [form]);

  function updateField<K extends keyof InquiryForm>(
    key: K,
    value: InquiryForm[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSubmitError("");
    setSubmitted(false);
  }

  async function copyMessage(label: string, message: string) {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedLabel(label);
      window.setTimeout(() => setCopiedLabel(""), 1800);
    } catch {
      window.alert("Copy failed. Please copy the message manually.");
    }
  }

  async function submitInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: InquiryForm = {
      name: cleanValue(form.name),
      preferredContact: cleanValue(form.preferredContact),
      role: cleanValue(form.role),
      business: cleanValue(form.business),
      country: cleanValue(form.country),
      solutionInterest: cleanValue(form.solutionInterest),
      projectNeed: cleanValue(form.projectNeed),
      timeline: cleanValue(form.timeline),
      notes: cleanValue(form.notes),
    };

    if (!payload.name || !payload.preferredContact || !payload.projectNeed) {
      setSubmitError(
        "Please add your name, preferred contact detail, and what you need reviewed."
      );
      return;
    }

    if (!online) {
      saveDraft(payload);
      setSubmitError(
        "You are offline. Your inquiry draft is saved on this device. Copy it now, then submit again when you reconnect."
      );
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setSubmitted(false);

    try {
      await addDoc(collection(firestore, "inquiries"), {
        ...payload,
        source: "contact_page",
        product: "AdminHub Global",
        status: "new",
        stage: "new_inquiry",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      clearDraft();
      setForm(initialForm);
      setSubmitted(true);
    } catch (error) {
      console.error("AdminHub Global inquiry submit failed:", error);
      saveDraft(payload);
      setSubmitError(
        "The inquiry could not be submitted right now. Your draft is still saved on this device."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main" className="bg-[var(--background)] text-[var(--foreground)]">
      <section className="section-shell relative">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[rgba(77,163,255,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[rgba(24,199,184,0.1)] blur-3xl" />

        <div className="container relative">
          {!online ? (
            <div className="mb-5 rounded-[1.25rem] border border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] px-4 py-3 text-sm leading-7 text-[#fcd34d]">
              <div className="flex items-start gap-2">
                <WifiOff size={17} className="mt-1 shrink-0" />
                <p>
                  You are offline. This page can still be viewed, and your draft
                  can be copied, but new inquiry submission needs internet.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-5 rounded-[1.25rem] border border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] px-4 py-3 text-sm leading-7 text-[#86efac]">
              <div className="flex items-start gap-2">
                <Wifi size={17} className="mt-1 shrink-0" />
                <p>
                  Online. Structured inquiry capture is ready. Direct private
                  phone or email details are intentionally not published here.
                </p>
              </div>
            </div>
          )}

          <div className="card-elevated overflow-hidden">
            <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-10">
              <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />

              <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div>
                  <div className="eyebrow">
                    <ShieldCheck size={15} />
                    AdminHub Global • Structured Inquiry
                  </div>

                  <h1 className="max-w-[12ch]">
                    Submit details before private follow-up.
                  </h1>

                  <p className="mt-4 max-w-[64ch] text-base leading-8 text-[var(--text-secondary)]">
                    AdminHub Global uses a controlled inquiry flow. Share your
                    identity, business context, region, role, and what you need
                    reviewed first. Then AdminHub can assess the request and
                    follow up privately.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <a href="#inquiry-form" className="btn btn-primary">
                      <ClipboardList size={18} />
                      Start Inquiry
                    </a>

                    <Link
                      href="/solutions"
                      prefetch={false}
                      className="btn btn-outline"
                    >
                      View Solutions
                      <ArrowRight size={18} />
                    </Link>

                    <Link
                      href="/partners"
                      prefetch={false}
                      className="btn btn-ghost"
                    >
                      <Users size={18} />
                      Partner Portal
                    </Link>
                  </div>
                </div>

                <div className="frame-gold p-5 md:p-6">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-[var(--brand-primary)]">
                      <LockKeyhole size={20} />
                    </span>

                    <div>
                      <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-[var(--brand-primary)]">
                        Contact policy
                      </p>

                      <h2 className="mt-2 text-2xl">
                        No public phone or email exposure.
                      </h2>

                      <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                        The public site should record who is making contact,
                        what they need, where they are based, and whether they
                        are a client, agent, partner, or existing user before
                        any private contact details are used.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {submitted ? (
            <div className="mt-6 rounded-[1.25rem] border border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] p-4 text-sm leading-7 text-[#86efac]">
              <div className="flex items-start gap-2">
                <Check size={18} className="mt-1 shrink-0" />
                <p>
                  Inquiry submitted. AdminHub can now review the details before
                  private follow-up.
                </p>
              </div>
            </div>
          ) : null}

          {submitError ? (
            <div className="mt-6 rounded-[1.25rem] border border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] p-4 text-sm leading-7 text-[#fcd34d]">
              {submitError}
            </div>
          ) : null}
        </div>
      </section>

      <section className="section-shell pt-0">
        <div className="container">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section id="inquiry-form" className="card-elevated overflow-hidden">
              <form onSubmit={submitInquiry} className="card-inner space-y-5 md:p-6">
                <div>
                  <div className="eyebrow mb-0">
                    <ClipboardList size={15} />
                    Inquiry form
                  </div>

                  <h2 className="mt-2 text-2xl">
                    Tell AdminHub what needs review.
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    Required fields are name, preferred contact detail, and what
                    you need reviewed. The rest helps qualify the request faster.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label">Name *</label>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        updateField("name", event.target.value)
                      }
                      className="input"
                      placeholder="Your name"
                      autoComplete="name"
                    />
                  </div>

                  <div>
                    <label className="label">Preferred contact detail *</label>
                    <input
                      value={form.preferredContact}
                      onChange={(event) =>
                        updateField("preferredContact", event.target.value)
                      }
                      className="input"
                      placeholder="Email, phone, LinkedIn, or preferred method"
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label className="label">I am interested as</label>
                    <select
                      value={form.role}
                      onChange={(event) =>
                        updateField("role", event.target.value)
                      }
                      className="select"
                    >
                      <option value="">Select role</option>
                      {roleOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Country / Region</label>
                    <input
                      value={form.country}
                      onChange={(event) =>
                        updateField("country", event.target.value)
                      }
                      className="input"
                      placeholder="Country or region"
                    />
                  </div>

                  <div>
                    <label className="label">Business / Organisation</label>
                    <input
                      value={form.business}
                      onChange={(event) =>
                        updateField("business", event.target.value)
                      }
                      className="input"
                      placeholder="Business or organisation name"
                      autoComplete="organization"
                    />
                  </div>

                  <div>
                    <label className="label">Solution interest</label>
                    <select
                      value={form.solutionInterest}
                      onChange={(event) =>
                        updateField("solutionInterest", event.target.value)
                      }
                      className="select"
                    >
                      <option value="">Select solution</option>
                      {solutionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Timeline</label>
                    <select
                      value={form.timeline}
                      onChange={(event) =>
                        updateField("timeline", event.target.value)
                      }
                      className="select"
                    >
                      <option value="">Select timeline</option>
                      {timelineOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">What do you need reviewed? *</label>
                    <textarea
                      value={form.projectNeed}
                      onChange={(event) =>
                        updateField("projectNeed", event.target.value)
                      }
                      className="textarea"
                      rows={5}
                      placeholder="Example: I need a 48-hour live proof for a training business, with a public site, admin dashboard, client portal, messaging, uploads, and monthly support."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label">Extra notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(event) =>
                        updateField("notes", event.target.value)
                      }
                      className="textarea"
                      rows={4}
                      placeholder="Anything else AdminHub should know before private follow-up."
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    {submitting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    {submitting ? "Submitting..." : "Submit Inquiry"}
                  </button>

                  <button
                    type="button"
                    onClick={() => copyMessage("summary", inquirySummary)}
                    className="btn btn-outline"
                  >
                    {copiedLabel === "summary" ? (
                      <Check size={18} />
                    ) : (
                      <Copy size={18} />
                    )}
                    {copiedLabel === "summary"
                      ? "Copied"
                      : "Copy Inquiry Summary"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      clearDraft();
                      setForm(initialForm);
                      setSubmitted(false);
                      setSubmitError("");
                    }}
                    className="btn btn-ghost"
                  >
                    Clear Draft
                  </button>
                </div>

                <p className="text-xs leading-6 text-[var(--text-muted)]">
                  This inquiry is saved to Firestore as a new AdminHub Global
                  inquiry. If you go offline before submitting, your draft stays
                  saved locally on this device.
                </p>
              </form>
            </section>

            <div className="space-y-6">
              <InfoPanel
                eyebrow="What to include"
                title="Details that help qualify faster"
                icon={<FileText size={18} />}
              >
                <ul className="mt-4 space-y-2">
                  {[
                    "Whether you are asking as a client, agent, partner, or existing user",
                    "Your business or organisation name",
                    "Country, region, or target market",
                    "The workflow, portal, dashboard, or support problem",
                    "Whether this is a proof sprint, full PWA, or managed support inquiry",
                    "Any existing website, PDF, company profile, or system context",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-sm leading-7 text-[var(--text-secondary)]"
                    >
                      <CheckCircle2
                        size={16}
                        className="mt-1 shrink-0 text-[var(--brand-primary)]"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </InfoPanel>

              <InfoPanel
                eyebrow="Useful routes"
                title="Explore before submitting"
                icon={<LayoutDashboard size={18} />}
              >
                <div className="mt-4 grid gap-2">
                  <Link
                    href="/solutions"
                    prefetch={false}
                    className="btn btn-outline w-full"
                  >
                    <Globe2 size={18} />
                    Solutions Overview
                  </Link>

                  <Link
                    href="/c/rapid-proof"
                    prefetch={false}
                    className="btn btn-outline w-full"
                  >
                    <Workflow size={18} />
                    48-Hour Live Proof
                  </Link>

                  <Link
                    href="/partners"
                    prefetch={false}
                    className="btn btn-outline w-full"
                  >
                    <Users size={18} />
                    Partner Portal
                  </Link>

                  <Link
                    href="/blog"
                    prefetch={false}
                    className="btn btn-outline w-full"
                  >
                    <FileText size={18} />
                    Insights
                  </Link>
                </div>
              </InfoPanel>

              <InfoPanel
                eyebrow="Privacy-first contact"
                title="Why there is no public number here"
                icon={<LockKeyhole size={18} />}
              >
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  AdminHub Global is intentionally set up so visitors submit
                  identity and project context first. This avoids exposing
                  private contact details publicly while still creating a clear
                  path for serious inquiries, partner requests, and client
                  follow-up.
                </p>
              </InfoPanel>

              <InfoPanel
                eyebrow="Platform scope"
                title="Custom, not boxed-in"
                icon={<Network size={18} />}
              >
                <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                  AdminHub Global is built around a custom Next.js, TailwindCSS,
                  Firebase, UploadThing, and PWA framework for workflows,
                  portals, dashboards, files, messaging, PDFs, and managed
                  support.
                </p>
              </InfoPanel>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoPanel({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card-outline-gold h-full">
      <div className="card-inner md:p-6">
        <div className="eyebrow mb-0">
          {icon}
          {eyebrow}
        </div>

        <h2 className="mt-2 text-xl">{title}</h2>

        {children}
      </div>
    </section>
  );
}