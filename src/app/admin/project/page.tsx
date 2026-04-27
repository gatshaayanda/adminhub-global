"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardList,
  Eye,
  FileText,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquareMore,
  Pencil,
  Plus,
  ShieldCheck,
  UserRound,
  Workflow,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import AdminHubLoader from "@/components/AdminHubLoader";

interface AdminHubProject {
  id: string;
  displayName: string;
  clientEmail?: string;
  clientPhone?: string;
  countryRegion?: string;
  projectType?: string;
  packageSelected?: string;
  stage?: string;
  status?: string;
  supportStatus?: string;
  agentName?: string;
  agentEmail?: string;
  progressUpdate?: string;
  nextFollowUp?: string;
  hasClientMessages: boolean;
}

const ADMIN_SENDER_NAMES = [
  "AdminHub Global Team",
  "AdminHub Team",
  "The AdminHub Team",
  "Admin",
];

function niceLabel(value?: string) {
  if (!value) return "—";

  return value
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function pickFirst(...values: unknown[]) {
  for (const value of values) {
    const clean = cleanString(value);
    if (clean) return clean;
  }

  return "";
}

function isAdminSender(sender: unknown) {
  const clean = cleanString(sender).toLowerCase();

  if (!clean) return false;

  return ADMIN_SENDER_NAMES.some(
    (name) => clean === name.toLowerCase() || clean.includes(name.toLowerCase())
  );
}

export default function ProjectListPage() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<AdminHubProject[]>([]);

  useEffect(() => {
    const fetchProjectsAndMessages = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(firestore, "projects"),
            where("admin_id", "==", "admin")
          )
        );

        const rows: AdminHubProject[] = await Promise.all(
          snap.docs.map(async (docSnap) => {
            const data = docSnap.data() as Record<string, unknown>;
            const projectId = docSnap.id;

            const displayName =
              pickFirst(
                data.project_name,
                data.client_name,
                data.business_name,
                data.business,
                data.company_name,
                data.client_email
              ) || "Unnamed AdminHub Project";

            const clientEmail = pickFirst(data.client_email, data.email);
            const clientPhone = pickFirst(data.client_phone, data.phone);

            const countryRegion = pickFirst(
              data.country_region,
              data.country,
              data.region,
              data.city_town,
              data.city
            );

            const projectType = pickFirst(
              data.project_type,
              data.request_type,
              data.solution_type,
              data.service_type
            );

            const packageSelected = pickFirst(
              data.package_selected,
              data.package,
              data.quote_package,
              data.product_interest
            );

            const stage = pickFirst(
              data.pipeline_stage,
              data.stage,
              data.lead_stage,
              data.workflow_stage
            );

            const status = pickFirst(data.status, data.project_status);

            const supportStatus = pickFirst(
              data.support_status,
              data.retainer_status,
              data.monthly_support_status,
              data.renewal_status
            );

            const agentName = pickFirst(data.agent_name, data.partner_name);
            const agentEmail = pickFirst(data.agent_email, data.partner_email);

            const progressUpdate = pickFirst(
              data.progress_update,
              data.latest_update,
              data.admin_summary
            );

            const nextFollowUp = pickFirst(
              data.next_follow_up,
              data.follow_up_date,
              data.next_action
            );

            const messagesSnap = await getDocs(
              query(
                collection(firestore, "projects", projectId, "messages"),
                orderBy("timestamp", "desc"),
                limit(10)
              )
            );

            const hasClientMessages = messagesSnap.docs.some((msg) => {
              const sender = msg.data().sender;
              return typeof sender === "string" && !isAdminSender(sender);
            });

            return {
              id: projectId,
              displayName,
              clientEmail,
              clientPhone,
              countryRegion,
              projectType,
              packageSelected,
              stage,
              status,
              supportStatus,
              agentName,
              agentEmail,
              progressUpdate,
              nextFollowUp,
              hasClientMessages,
            };
          })
        );

        rows.sort((a, b) => {
          if (a.hasClientMessages !== b.hasClientMessages) {
            return a.hasClientMessages ? -1 : 1;
          }

          const aStage = a.stage || a.status || "";
          const bStage = b.stage || b.status || "";

          if (aStage !== bStage) {
            return aStage.localeCompare(bStage);
          }

          return a.displayName.localeCompare(b.displayName);
        });

        setProjects(rows);
      } catch (err) {
        console.error("Failed to load AdminHub Global projects", err);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectsAndMessages();
  }, []);

  const stats = useMemo(() => {
    const needsReply = projects.filter((item) => item.hasClientMessages).length;

    const liveProof = projects.filter((item) => {
      const joined = `${item.stage} ${item.status} ${item.projectType}`.toLowerCase();
      return (
        joined.includes("proof") ||
        joined.includes("prototype") ||
        joined.includes("preview")
      );
    }).length;

    const buildStage = projects.filter((item) => {
      const joined = `${item.stage} ${item.status}`.toLowerCase();
      return (
        joined.includes("build") ||
        joined.includes("implementation") ||
        joined.includes("onboard") ||
        joined.includes("launch")
      );
    }).length;

    const managedSupport = projects.filter((item) => {
      const joined = `${item.supportStatus} ${item.status}`.toLowerCase();
      return (
        joined.includes("support") ||
        joined.includes("retainer") ||
        joined.includes("monthly") ||
        joined.includes("active")
      );
    }).length;

    return {
      total: projects.length,
      needsReply,
      liveProof,
      buildStage,
      managedSupport,
    };
  }, [projects]);

  if (loading) return <AdminHubLoader />;

  return (
    <main
      id="main"
      className="min-h-screen bg-[var(--background)] text-[var(--foreground)]"
    >
      <section className="section-shell relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[rgba(77,163,255,0.12)] blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-[rgba(24,199,184,0.1)] blur-3xl" />

        <div className="container relative">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5">
              <Link
                href="/admin/dashboard"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to AdminHub Global Control
              </Link>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-10">
                  <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />

                  <div className="relative">
                    <div className="eyebrow">
                      <FolderKanban size={15} />
                      AdminHub Global • Project Workspace
                    </div>

                    <h1 className="max-w-[14ch]">
                      Manage client builds, proof sprints, and support records.
                    </h1>

                    <p className="mt-4 max-w-[64ch] text-base leading-8 text-[var(--text-secondary)]">
                      This is the working list for AdminHub Global delivery.
                      Track prospects that became projects, 48-hour proof
                      sprints, onboarding, implementation, client portal access,
                      messaging, files, and recurring managed support.
                    </p>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      <Link
                        href="/admin/project/create-project"
                        prefetch={false}
                        className="btn btn-primary"
                      >
                        <Plus size={18} />
                        New Project Record
                      </Link>

                      <Link
                        href="/admin/dashboard/clients"
                        prefetch={false}
                        className="btn btn-outline"
                      >
                        <MessageSquareMore size={18} />
                        Open Client Conversations
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <ShieldCheck size={15} />
                    Delivery overview
                  </div>

                  <h2 className="mt-2 text-2xl">Current workspace status</h2>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <StatCard label="Total Projects" value={String(stats.total)} />
                    <StatCard
                      label="Needs Reply"
                      value={String(stats.needsReply)}
                    />
                    <StatCard
                      label="Live Proof"
                      value={String(stats.liveProof)}
                    />
                    <StatCard
                      label="Build Stage"
                      value={String(stats.buildStage)}
                    />
                    <StatCard
                      label="Managed Support"
                      value={String(stats.managedSupport)}
                    />
                  </div>

                  <div className="mt-5 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                    <p className="text-sm font-extrabold text-[var(--text-primary)]">
                      Message rule
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                      A project is marked as needing attention when a recent
                      conversation sender is not one of the AdminHub Global admin
                      sender names.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className="mt-8">
              <div className="mb-4">
                <div className="eyebrow">
                  <UserRound size={15} />
                  Client project list
                </div>
                <h2 className="mt-2 text-2xl">Active delivery records</h2>
              </div>

              {projects.length === 0 ? (
                <div className="frame-gold p-8 text-center">
                  <h3 className="text-2xl">No project records yet</h3>
                  <p className="mx-auto mt-3 max-w-[58ch] text-sm leading-7 text-[var(--text-secondary)]">
                    Create your first AdminHub Global project record to begin
                    tracking a lead after conversion, proof sprint, onboarding,
                    implementation, client workspace, and managed support.
                  </p>

                  <div className="mt-5 flex justify-center">
                    <Link
                      href="/admin/project/create-project"
                      prefetch={false}
                      className="btn btn-primary"
                    >
                      <Plus size={18} />
                      Create Project Record
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {projects.map((item) => (
                    <article key={item.id} className="card-outline-gold">
                      <div className="card-inner md:p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-xl">{item.displayName}</h3>

                              {item.hasClientMessages ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-green-400/30 bg-green-400/10 px-2.5 py-1 text-xs font-bold text-green-200">
                                  <BadgeCheck size={14} />
                                  New Client Message
                                </span>
                              ) : (
                                <span className="rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                                  No New Messages
                                </span>
                              )}

                              {item.status ? (
                                <span className="rounded-full border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-2.5 py-1 text-xs font-bold text-[var(--text-secondary)]">
                                  {niceLabel(item.status)}
                                </span>
                              ) : null}

                              {item.stage ? (
                                <span className="rounded-full border border-[rgba(77,163,255,0.28)] bg-[rgba(77,163,255,0.1)] px-2.5 py-1 text-xs font-bold text-[var(--brand-primary)]">
                                  {niceLabel(item.stage)}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--text-muted)]">
                              {item.clientEmail ? (
                                <span className="inline-flex items-center gap-2">
                                  <Mail size={14} />
                                  {item.clientEmail}
                                </span>
                              ) : null}

                              {item.countryRegion ? (
                                <span className="inline-flex items-center gap-2">
                                  <MapPin size={14} />
                                  {item.countryRegion}
                                </span>
                              ) : null}

                              {item.agentName || item.agentEmail ? (
                                <span className="inline-flex items-center gap-2">
                                  <BriefcaseBusiness size={14} />
                                  {item.agentName || item.agentEmail}
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.projectType ? (
                                <span className="badge">
                                  <Globe2 size={14} />
                                  {niceLabel(item.projectType)}
                                </span>
                              ) : null}

                              {item.packageSelected ? (
                                <span className="badge">
                                  <LayoutDashboard size={14} />
                                  {niceLabel(item.packageSelected)}
                                </span>
                              ) : null}

                              {item.supportStatus ? (
                                <span className="badge badge-neutral">
                                  <Workflow size={14} />
                                  {niceLabel(item.supportStatus)}
                                </span>
                              ) : null}

                              {item.nextFollowUp ? (
                                <span className="badge badge-neutral">
                                  <ClipboardList size={14} />
                                  {item.nextFollowUp}
                                </span>
                              ) : null}
                            </div>

                            {item.progressUpdate ? (
                              <p className="mt-4 line-clamp-2 max-w-[72ch] text-sm leading-7 text-[var(--text-secondary)]">
                                {item.progressUpdate}
                              </p>
                            ) : (
                              <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
                                No project progress update added yet.
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <Link
                              href={`/admin/project/${item.id}/edit`}
                              prefetch={false}
                              className="btn btn-outline"
                            >
                              <Pencil size={16} />
                              Edit
                            </Link>

                            <Link
                              href={`/admin/project/${item.id}`}
                              prefetch={false}
                              className="btn btn-ghost"
                            >
                              <Eye size={16} />
                              View
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Admin note:</b> use this
              page as the delivery triage view for AdminHub Global. Projects with
              new client messages, active proof sprints, upcoming onboarding
              tasks, or managed support obligations should usually be reviewed
              first.
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