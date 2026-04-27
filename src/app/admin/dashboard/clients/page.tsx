"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Edit3,
  ExternalLink,
  FileText,
  Mail,
  MessageSquareMore,
  Network,
  Plus,
  ShieldCheck,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import AdminHubLoader from "@/components/AdminHubLoader";
import ChatPanel from "@/components/ChatPanel";

type ClientWorkspaceRecord = {
  id: string;
  admin_id?: string;

  // Existing reusable framework fields
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_type?: string;

  business?: string;
  business_name?: string;
  city_town?: string;
  country?: string;

  request_type?: string;
  cover_type?: string;
  product_interest?: string;
  industry?: string;

  risk_items?: string;
  support_summary?: string;
  required_documents?: string;

  portal_access?: boolean;
  admin_panel?: boolean;

  status?: string;
  admin_notes?: string;
  progress_update?: string;
  resource_link?: string;

  documentUrl?: string;
  documentName?: string;
  documentType?: string;

  title?: string;

  // AdminHub Global forward-compatible fields
  role?: string;
  interest_type?: string;
  lead_source?: string;
  package_interest?: string;
  service_tier?: string;
  workflow_need?: string;
  project_scope?: string;
  proof_status?: string;
  support_plan?: string;
};

const ADMIN_SENDER = "AdminHub Global Team";

function niceLabel(value?: string) {
  if (!value) return "—";

  return value
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getDisplayName(record: ClientWorkspaceRecord) {
  return (
    record.client_name?.trim() ||
    record.business_name?.trim() ||
    record.business?.trim() ||
    record.client_email?.trim() ||
    "Unnamed Workspace"
  );
}

function getOrganisationName(record: ClientWorkspaceRecord) {
  return (
    record.business_name?.trim() ||
    record.business?.trim() ||
    record.client_name?.trim() ||
    "Not provided"
  );
}

function getWorkspaceLabel(record: ClientWorkspaceRecord) {
  return (
    record.package_interest?.trim() ||
    record.service_tier?.trim() ||
    record.product_interest?.trim() ||
    record.workflow_need?.trim() ||
    record.project_scope?.trim() ||
    record.title?.trim() ||
    niceLabel(record.request_type) ||
    "Client Workspace"
  );
}

function getNeedSummary(record: ClientWorkspaceRecord) {
  return (
    record.workflow_need?.trim() ||
    record.project_scope?.trim() ||
    record.support_summary?.trim() ||
    record.risk_items?.trim() ||
    "No project need summary has been added yet."
  );
}

function getProgressUpdate(record: ClientWorkspaceRecord) {
  return (
    record.progress_update?.trim() ||
    "No progress update has been added yet."
  );
}

function getStatus(record: ClientWorkspaceRecord) {
  return record.status?.trim() || record.proof_status?.trim() || "";
}

function statusRank(status?: string) {
  const value = (status || "").toLowerCase();

  if (value === "new inquiry") return 1;
  if (value === "new lead") return 1;
  if (value === "lead") return 1;
  if (value === "qualified") return 2;
  if (value === "discovery") return 3;
  if (value === "proof in progress") return 4;
  if (value === "48-hour proof") return 4;
  if (value === "proof sent") return 5;
  if (value === "deposit pending") return 6;
  if (value === "implementation") return 7;
  if (value === "build in progress") return 7;
  if (value === "launch prep") return 8;
  if (value === "monthly support") return 9;
  if (value === "active support") return 9;
  if (value === "closed") return 99;

  return 20;
}

function portalEnabled(record: ClientWorkspaceRecord) {
  return record.portal_access === true || record.admin_panel === true;
}

export default function AdminClientsPage() {
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<ClientWorkspaceRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let alive = true;

    async function loadWorkspaces() {
      try {
        const snap = await getDocs(collection(firestore, "projects"));

        const rows = snap.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<ClientWorkspaceRecord, "id">),
          }))
          .filter((record) => !record.admin_id || record.admin_id === "admin")
          .sort((a, b) => {
            const statusDiff = statusRank(getStatus(a)) - statusRank(getStatus(b));
            if (statusDiff !== 0) return statusDiff;

            return getDisplayName(a).localeCompare(getDisplayName(b));
          });

        if (!alive) return;

        setWorkspaces(rows);

        if (rows.length > 0) {
          setSelectedId((current) => current || rows[0].id);
        }
      } catch (error) {
        console.error("Failed to load AdminHub Global workspaces:", error);

        if (!alive) return;

        setWorkspaces([]);
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadWorkspaces();

    return () => {
      alive = false;
    };
  }, []);

  const selectedWorkspace = useMemo(
    () => workspaces.find((record) => record.id === selectedId) || null,
    [workspaces, selectedId]
  );

  const stats = useMemo(() => {
    const clientKeys = new Set(
      workspaces.map((record) => {
        return (
          record.client_email?.trim().toLowerCase() ||
          record.business_name?.trim().toLowerCase() ||
          record.business?.trim().toLowerCase() ||
          record.id
        );
      })
    );

    return {
      total: workspaces.length,
      clients: clientKeys.size,
      active: workspaces.filter((record) => getStatus(record) !== "closed").length,
      portalReady: workspaces.filter(portalEnabled).length,
    };
  }, [workspaces]);

  if (loading) return <AdminHubLoader />;

  return (
    <main
      id="main"
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <section className="section-shell relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />
        <div className="pointer-events-none absolute -left-24 top-12 h-72 w-72 rounded-full bg-[rgba(77,163,255,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-12 h-72 w-72 rounded-full bg-[rgba(24,199,184,0.1)] blur-3xl" />

        <div className="container relative">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/admin/dashboard"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>

              <Link
                href="/admin/project/create-project"
                prefetch={false}
                className="btn btn-primary"
              >
                <Plus size={16} />
                New Workspace
              </Link>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-10">
                  <div className="eyebrow">
                    <Users size={15} />
                    AdminHub Global • Client & Partner Workspaces
                  </div>

                  <h1 className="max-w-[13ch]">
                    Manage client access, partner handoff, and project support.
                  </h1>

                  <p className="mt-4 max-w-[66ch] text-base leading-8 text-[var(--text-secondary)]">
                    This page gives AdminHub Global one place to review client
                    workspaces, agent-led opportunities, proof-stage records,
                    project status, saved files, and workspace conversations as{" "}
                    <b>{ADMIN_SENDER}</b>.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="badge">
                      <Network size={14} />
                      Lead to launch
                    </span>
                    <span className="badge">
                      <Workflow size={14} />
                      Proof to support
                    </span>
                    <span className="badge badge-neutral">
                      <ShieldCheck size={14} />
                      Portal-ready tracking
                    </span>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <ShieldCheck size={15} />
                    Overview
                  </div>

                  <h2 className="mt-2 text-2xl">Workspace status</h2>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <StatCard label="Records" value={String(stats.total)} />
                    <StatCard label="Clients" value={String(stats.clients)} />
                    <StatCard label="Active" value={String(stats.active)} />
                    <StatCard
                      label="Portal Ready"
                      value={String(stats.portalReady)}
                    />
                  </div>

                  <div className="mt-5 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                    <p className="text-sm font-extrabold text-[var(--text-primary)]">
                      Communication rule
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      Keep messages structured, professional, and action-focused.
                      This workspace should support the client journey from lead
                      to 48-hour proof, implementation, launch, and recurring
                      support.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {workspaces.length === 0 ? (
              <div className="mt-8 frame-gold p-8 text-center">
                <h2 className="text-2xl">No workspaces found</h2>
                <p className="mx-auto mt-3 max-w-[56ch] text-sm leading-7 text-[var(--text-secondary)]">
                  Create the first AdminHub Global workspace. Once records exist
                  in the <b>projects</b> collection, they will appear here and
                  the message panel will continue using the existing{" "}
                  <b>/projects/{"{projectId}"}/messages</b> structure.
                </p>

                <div className="mt-5 flex justify-center">
                  <Link
                    href="/admin/project/create-project"
                    prefetch={false}
                    className="btn btn-primary"
                  >
                    <Plus size={16} />
                    Create Workspace
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
                <aside className="space-y-4">
                  <div className="card-outline-gold">
                    <div className="card-inner md:p-6">
                      <div className="eyebrow mb-0">
                        <UserRound size={15} />
                        Workspace list
                      </div>

                      <h2 className="mt-2 text-xl">Select a record</h2>

                      <div className="mt-5 space-y-3">
                        {workspaces.map((record) => {
                          const active = selectedId === record.id;
                          const status = getStatus(record);

                          return (
                            <button
                              key={record.id}
                              type="button"
                              onClick={() => setSelectedId(record.id)}
                              className={`w-full rounded-[1.25rem] border p-4 text-left transition ${
                                active
                                  ? "border-[var(--brand-primary)] bg-[var(--brand-tint)]"
                                  : "border-[var(--border)] bg-[rgba(15,23,42,0.72)] hover:bg-[rgba(77,163,255,0.08)]"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-extrabold text-[var(--text-primary)]">
                                    {getDisplayName(record)}
                                  </div>
                                  <div className="mt-1 text-sm text-[var(--text-secondary)]">
                                    {getWorkspaceLabel(record)}
                                  </div>
                                </div>

                                {active ? (
                                  <BadgeCheck
                                    size={18}
                                    className="shrink-0 text-[var(--brand-primary)]"
                                  />
                                ) : null}
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full border border-[var(--border)] bg-[rgba(6,10,18,0.42)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                                  {niceLabel(status)}
                                </span>

                                {record.request_type ? (
                                  <span className="rounded-full border border-[var(--border)] bg-[rgba(6,10,18,0.42)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                                    {niceLabel(record.request_type)}
                                  </span>
                                ) : null}

                                {portalEnabled(record) ? (
                                  <span className="rounded-full border border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.1)] px-2.5 py-1 text-xs font-bold text-[#86efac]">
                                    Portal
                                  </span>
                                ) : null}
                              </div>

                              {record.client_email ? (
                                <div className="mt-3 inline-flex max-w-full items-center gap-2 text-xs text-[var(--text-muted)]">
                                  <Mail size={13} className="shrink-0" />
                                  <span className="truncate">
                                    {record.client_email}
                                  </span>
                                </div>
                              ) : null}

                              {record.progress_update ? (
                                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                                  {record.progress_update}
                                </p>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </aside>

                <section className="space-y-4">
                  {selectedWorkspace ? (
                    <>
                      <div className="card-outline-gold">
                        <div className="card-inner md:p-6">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="eyebrow mb-0">
                                <MessageSquareMore size={15} />
                                Active workspace
                              </div>

                              <h2 className="mt-2 text-2xl">
                                {getDisplayName(selectedWorkspace)}
                              </h2>

                              <p className="mt-2 max-w-[62ch] text-sm leading-7 text-[var(--text-secondary)]">
                                {getWorkspaceLabel(selectedWorkspace)}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/admin/project/${selectedWorkspace.id}`}
                                prefetch={false}
                                className="btn btn-ghost"
                              >
                                <ExternalLink size={16} />
                                Open Full Record
                              </Link>

                              <Link
                                href={`/admin/project/${selectedWorkspace.id}/edit`}
                                prefetch={false}
                                className="btn btn-outline"
                              >
                                <Edit3 size={16} />
                                Edit
                              </Link>
                            </div>
                          </div>

                          <div className="mt-5 grid gap-3 md:grid-cols-3">
                            <InfoMini
                              label="Client / Lead"
                              value={getDisplayName(selectedWorkspace)}
                            />
                            <InfoMini
                              label="Organisation"
                              value={getOrganisationName(selectedWorkspace)}
                            />
                            <InfoMini
                              label="Email"
                              value={
                                selectedWorkspace.client_email || "Not provided"
                              }
                            />
                            <InfoMini
                              label="Status"
                              value={niceLabel(getStatus(selectedWorkspace))}
                            />
                            <InfoMini
                              label="Request"
                              value={niceLabel(selectedWorkspace.request_type)}
                            />
                            <InfoMini
                              label="Package / Need"
                              value={getWorkspaceLabel(selectedWorkspace)}
                            />
                          </div>

                          <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                            <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                              <BriefcaseBusiness
                                size={15}
                                className="text-[var(--brand-primary)]"
                              />
                              Need / scope summary
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                              {getNeedSummary(selectedWorkspace)}
                            </p>
                          </div>

                          <div className="mt-4 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                            <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                              <ClipboardList
                                size={15}
                                className="text-[var(--brand-primary)]"
                              />
                              Progress update
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                              {getProgressUpdate(selectedWorkspace)}
                            </p>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {selectedWorkspace.documentUrl ? (
                              <a
                                href={selectedWorkspace.documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start justify-between gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 transition hover:bg-[rgba(77,163,255,0.08)]"
                              >
                                <div>
                                  <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                                    <FileText size={15} />
                                    Saved File
                                  </div>
                                  <div className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                                    {selectedWorkspace.documentName ||
                                      "Open uploaded PDF/image"}
                                  </div>
                                </div>
                                <ExternalLink
                                  size={18}
                                  className="mt-1 shrink-0 text-[var(--brand-primary)]"
                                />
                              </a>
                            ) : null}

                            {selectedWorkspace.resource_link ? (
                              <a
                                href={selectedWorkspace.resource_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start justify-between gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 transition hover:bg-[rgba(77,163,255,0.08)]"
                              >
                                <div>
                                  <div className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                                    <Building2 size={15} />
                                    Shared Resource
                                  </div>
                                  <div className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                                    Open linked document, profile, proposal, or
                                    shared file.
                                  </div>
                                </div>
                                <ExternalLink
                                  size={18}
                                  className="mt-1 shrink-0 text-[var(--brand-primary)]"
                                />
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <ChatPanel
                        projectId={selectedWorkspace.id}
                        senderName={ADMIN_SENDER}
                        canDeleteAll={true}
                        brand={{
                          primary: "#4DA3FF",
                          accent: "#18C7B8",
                        }}
                      />
                    </>
                  ) : null}
                </section>
              </div>
            )}

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Admin note:</b> this page
              preserves the existing <b>projects</b> collection and nested
              messages wiring, but reframes the workflow for AdminHub Global:
              lead records, client workspaces, partner handoff, live proof,
              implementation, and managed support. No public personal phone or
              email details are exposed here.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 text-center">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-3xl font-extrabold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}