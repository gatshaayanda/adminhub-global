"use client";

import Link from "next/link";
import jsPDF from "jspdf";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Wifi,
  WifiOff,
  Workflow,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import AdminHubLoader from "@/components/AdminHubLoader";
import ChatPanel from "@/components/ChatPanel";

type ClientProject = {
  id: string;

  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_type?: string;

  project_name?: string;
  business?: string;
  business_name?: string;
  organisation?: string;
  city_town?: string;
  country?: string;
  region?: string;
  industry?: string;

  request_type?: string;
  service_type?: string;
  selected_package?: string;
  package_name?: string;
  solution_interest?: string;

  status?: string;
  stage?: string;
  onboarding_status?: string;
  support_status?: string;
  recurring_status?: string;

  progress_update?: string;
  onboarding_requests?: string;
  required_documents?: string;
  build_notes?: string;
  support_summary?: string;
  next_steps?: string;
  internal_safe_summary?: string;

  portal_access?: boolean;
  admin_panel?: boolean;

  resource_link?: string;

  documentUrl?: string;
  documentName?: string;
  documentType?: string;

  proposalUrl?: string;
  proposalName?: string;
  proposalType?: string;
};

type CachedProject = {
  projectRecord: ClientProject;
  cachedAt: string;
};

type CachedDashboard = {
  projects: ClientProject[];
  messageCounts?: Record<string, number>;
  cachedAt: string;
};

const PDF_BRAND_BLUE: [number, number, number] = [77, 163, 255];
const PDF_BRAND_TEAL: [number, number, number] = [24, 199, 184];
const PDF_DARK: [number, number, number] = [10, 18, 32];
const PDF_SOFT_BG: [number, number, number] = [236, 245, 255];
const PDF_TEXT: [number, number, number] = [24, 31, 42];
const PDF_MUTED: [number, number, number] = [92, 104, 121];

const PROJECT_CACHE_PREFIX = "adminhub_global_client_project_cache_v1";
const DASHBOARD_CACHE_PREFIX = "adminhub_global_client_dashboard_cache_v1";

function projectCacheKey(email: string, id: string) {
  return `${PROJECT_CACHE_PREFIX}_${email.toLowerCase().trim()}_${id}`;
}

function dashboardCacheKey(email: string) {
  return `${DASHBOARD_CACHE_PREFIX}_${email.toLowerCase().trim()}`;
}

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function readCachedProject(email: string, id: string): CachedProject | null {
  if (typeof window === "undefined") return null;

  try {
    const direct = safeJsonParse<CachedProject>(
      localStorage.getItem(projectCacheKey(email, id))
    );

    if (direct?.projectRecord) return direct;

    const dashboard = safeJsonParse<CachedDashboard>(
      localStorage.getItem(dashboardCacheKey(email))
    );

    const fromDashboard = dashboard?.projects?.find((item) => item.id === id);

    if (fromDashboard) {
      return {
        projectRecord: fromDashboard,
        cachedAt: dashboard?.cachedAt || new Date().toISOString(),
      };
    }

    return null;
  } catch {
    return null;
  }
}

function saveCachedProject(
  email: string,
  id: string,
  projectRecord: ClientProject
) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      projectCacheKey(email, id),
      JSON.stringify({
        projectRecord,
        cachedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.warn("Could not save Client Hub project cache:", error);
  }
}

function formatCachedAt(value: string) {
  try {
    return new Date(value).toLocaleString("en-BW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "recently";
  }
}

function niceLabel(value?: string) {
  if (!value) return "—";

  return value
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getProjectTitle(item: ClientProject) {
  return (
    item.project_name?.trim() ||
    item.business_name?.trim() ||
    item.business?.trim() ||
    item.organisation?.trim() ||
    item.selected_package?.trim() ||
    item.package_name?.trim() ||
    item.client_name?.trim() ||
    "AdminHub Global Project"
  );
}

function getProjectPackage(item: ClientProject) {
  return (
    item.selected_package?.trim() ||
    item.package_name?.trim() ||
    item.service_type?.trim() ||
    item.request_type?.trim() ||
    item.solution_interest?.trim() ||
    "—"
  );
}

function getProjectStage(item: ClientProject) {
  return item.stage?.trim() || item.status?.trim() || "active";
}

function portalEnabled(item: ClientProject) {
  return item.portal_access === true || item.admin_panel === true;
}

function cleanPdfText(value: unknown) {
  const text =
    value && value.toString().trim().length > 0
      ? value.toString().trim()
      : "—";

  return text
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[•]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function pdfFileName(name: string, id: string) {
  const safeName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);

  return `adminhub-global-client-workspace-${safeName || id}.pdf`;
}

async function imageToDataUrl(path: string) {
  try {
    const response = await fetch(path);

    if (!response.ok) return "";

    const blob = await response.blob();

    return await new Promise<string>((resolve) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        resolve(typeof reader.result === "string" ? reader.result : "");
      };

      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

async function generateClientWorkspacePdf({
  id,
  record,
  title,
}: {
  id: string;
  record: ClientProject;
  title: string;
}) {
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const marginX = 16;
  const maxWidth = pageWidth - marginX * 2;

  let y = 18;

  const logoDataUrl = await imageToDataUrl("/logo.png");

  const addSmallHeader = () => {
    pdf.setFillColor(...PDF_DARK);
    pdf.rect(0, 0, pageWidth, 14, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...PDF_BRAND_BLUE);
    pdf.text("ADMINHUB GLOBAL", marginX, 9);

    pdf.setDrawColor(...PDF_BRAND_TEAL);
    pdf.line(marginX, 14, pageWidth - marginX, 14);

    y = 23;
  };

  const addPageIfNeeded = (needed = 18) => {
    if (y + needed > pageHeight - 22) {
      pdf.addPage();
      y = 18;
      addSmallHeader();
    }
  };

  const addSectionTitle = (sectionTitle: string) => {
    addPageIfNeeded(18);

    y += 4;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...PDF_DARK);
    pdf.text(sectionTitle, marginX, y);

    y += 3;

    pdf.setDrawColor(...PDF_BRAND_BLUE);
    pdf.line(marginX, y, pageWidth - marginX, y);

    y += 7;
  };

  const addField = (label: string, value: unknown) => {
    addPageIfNeeded(18);

    const cleanValue = cleanPdfText(value);
    const lines = pdf.splitTextToSize(cleanValue, maxWidth);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8.5);
    pdf.setTextColor(...PDF_BRAND_BLUE);
    pdf.text(label.toUpperCase(), marginX, y);

    y += 5;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...PDF_TEXT);
    pdf.text(lines, marginX, y);

    y += lines.length * 5 + 4;
  };

  const addFooter = () => {
    const pageCount = pdf.getNumberOfPages();

    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);

      pdf.setDrawColor(210, 220, 235);
      pdf.line(marginX, pageHeight - 16, pageWidth - marginX, pageHeight - 16);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...PDF_MUTED);

      pdf.text(
        "AdminHub Global | Client workspace summary | Structured inquiry before private follow-up",
        marginX,
        pageHeight - 10
      );

      pdf.text(
        `Page ${page} of ${pageCount}`,
        pageWidth - marginX - 22,
        pageHeight - 10
      );
    }
  };

  pdf.setFillColor(...PDF_DARK);
  pdf.rect(0, 0, pageWidth, 58, "F");

  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "PNG", marginX, 13, 24, 24);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.setTextColor(255, 255, 255);
  pdf.text("AdminHub Global", logoDataUrl ? marginX + 31 : marginX, 23);

  pdf.setFontSize(9);
  pdf.setTextColor(...PDF_BRAND_BLUE);
  pdf.text("CUSTOM PWA OS", logoDataUrl ? marginX + 31 : marginX, 30);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(210, 225, 245);
  pdf.text("Client Workspace Summary", logoDataUrl ? marginX + 31 : marginX, 37);

  pdf.setFillColor(...PDF_SOFT_BG);
  pdf.rect(0, 58, pageWidth, 28, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(...PDF_DARK);
  pdf.text(cleanPdfText(title), marginX, 69);

  y = 77;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...PDF_MUTED);
  pdf.text(`Generated: ${new Date().toLocaleString("en-BW")}`, marginX, y);

  y += 6;
  pdf.text(`Workspace ID: ${id}`, marginX, y);

  y += 10;

  pdf.setFillColor(...PDF_BRAND_BLUE);
  pdf.rect(marginX, y, pageWidth - marginX * 2, 9, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.text("CLIENT-SAFE WORKSPACE COPY", marginX + 4, y + 6);

  y += 18;

  addSectionTitle("Client Overview");
  addField("Client Name", record.client_name);
  addField("Client Email", record.client_email);
  addField("Client Type", niceLabel(record.client_type));
  addField("Business / Organisation", record.business_name || record.business || record.organisation);
  addField("Country / Region", record.country || record.region || record.city_town);

  addSectionTitle("Project Overview");
  addField("Project Title", title);
  addField("Status", niceLabel(record.status));
  addField("Stage", niceLabel(getProjectStage(record)));
  addField("Package / Solution", getProjectPackage(record));
  addField("Industry", record.industry);
  addField("Onboarding Status", niceLabel(record.onboarding_status));
  addField("Support Status", niceLabel(record.support_status));
  addField("Recurring Support Status", niceLabel(record.recurring_status));

  addSectionTitle("Latest Update");
  addField("Progress Update", record.progress_update);
  addField("Onboarding / Requested Items", record.onboarding_requests || record.required_documents);
  addField("Next Steps", record.next_steps);
  addField("Support Summary", record.support_summary);
  addField("Build Notes", record.build_notes);
  addField("Client-Safe Summary", record.internal_safe_summary);

  addSectionTitle("Files & Links");
  addField("Workspace File", record.documentName || record.documentUrl);
  addField("Document Type", record.documentType);
  addField("Document URL", record.documentUrl);
  addField("Proposal", record.proposalName || record.proposalUrl);
  addField("Proposal URL", record.proposalUrl);
  addField("Shared Resource Link", record.resource_link);

  addSectionTitle("Important Contact Policy");
  addField(
    "Private Follow-Up",
    "AdminHub Global does not publish direct personal phone or email details publicly. Client support and access issues should go through structured inquiry capture first so identity and context are recorded before private follow-up."
  );

  addSectionTitle("Important Note");
  addField(
    "Disclaimer",
    "This document is a client-facing workspace summary for reference, onboarding, delivery visibility, and communication support. It is not a contract, invoice, or final implementation scope unless separately confirmed in an approved proposal or agreement."
  );

  addFooter();

  pdf.save(pdfFileName(title, id));
}

export default function ClientProjectDetails() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [clientEmail, setClientEmail] = useState("");
  const [projectRecord, setProjectRecord] = useState<ClientProject | null>(null);
  const [cachedAt, setCachedAt] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [online, setOnline] = useState(true);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const updateOnlineStatus = () => {
      setOnline(navigator.onLine);
    };

    updateOnlineStatus();

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  async function loadProjectFromNetwork(email: string, hasCachedProject: boolean) {
    setError("");

    if (hasCachedProject) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const ref = doc(firestore, "projects", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        throw new Error("Client workspace not found.");
      }

      const data = {
        id: snap.id,
        ...(snap.data() as Omit<ClientProject, "id">),
      };

      if (data.client_email !== email) {
        throw new Error("You are not authorized to view this workspace.");
      }

      if (!portalEnabled(data)) {
        throw new Error(
          "This workspace is not enabled for Client Hub access yet."
        );
      }

      setProjectRecord(data);

      const savedAt = new Date().toISOString();
      setCachedAt(savedAt);

      saveCachedProject(email, id, data);
    } catch (err: any) {
      console.error("Failed to load Client Hub workspace:", err);

      const cached = readCachedProject(email, id);

      if (cached?.projectRecord) {
        setProjectRecord(cached.projectRecord);
        setCachedAt(cached.cachedAt || "");
        setError("");
      } else {
        setError(err?.message || "Failed to load Client Hub workspace.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("role="));

    const email = cookie ? decodeURIComponent(cookie.split("=")[1] || "") : "";

    if (!email || !email.includes("@")) {
      router.replace("/client/login");
      return;
    }

    setClientEmail(email);

    const cached = readCachedProject(email, id);
    const hasCachedProject = !!cached?.projectRecord;

    if (cached?.projectRecord) {
      setProjectRecord(cached.projectRecord);
      setCachedAt(cached.cachedAt || "");
      setLoading(false);
    }

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    loadProjectFromNetwork(email, hasCachedProject);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router, online]);

  const title = useMemo(() => {
    if (!projectRecord) return "AdminHub Global Project";
    return getProjectTitle(projectRecord);
  }, [projectRecord]);

  const handleRefresh = () => {
    if (!clientEmail || !online) return;
    loadProjectFromNetwork(clientEmail, !!projectRecord);
  };

  const handleDownloadPdf = async () => {
    if (!projectRecord) return;

    setPdfBusy(true);

    try {
      await generateClientWorkspacePdf({
        id,
        record: projectRecord,
        title,
      });
    } catch (err) {
      console.error("Failed to generate Client Hub PDF:", err);
      window.alert("Failed to generate PDF. Please try again.");
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading) return <AdminHubLoader />;

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <section className="section-shell relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 panel-grid opacity-60" />

          <div className="container relative">
            <div className="mx-auto max-w-3xl">
              <div className="mb-5">
                <Link
                  href="/client/dashboard"
                  prefetch={false}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
                >
                  <ArrowLeft size={16} />
                  Back to Client Hub
                </Link>
              </div>

              <div className="frame-gold p-8 text-center">
                <h1 className="text-2xl">Unable to open workspace</h1>
                <p className="mt-3 text-sm leading-7 text-red-200">{error}</p>

                <button
                  type="button"
                  onClick={() => router.push("/client/dashboard")}
                  className="btn btn-outline mt-5"
                >
                  Back to Client Hub
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!projectRecord) return null;

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
          <div className="mx-auto max-w-7xl">
            {!online ? (
              <div className="mb-5 rounded-[1.25rem] border border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] px-4 py-3 text-sm leading-7 text-[#fcd34d]">
                <div className="flex items-start gap-2">
                  <WifiOff size={17} className="mt-1 shrink-0" />
                  <p>
                    You are offline. This workspace is showing saved project
                    data from this device. Messages, files, proposals, and new
                    updates will refresh when you are online again.
                  </p>
                </div>
              </div>
            ) : cachedAt ? (
              <div className="mb-5 rounded-[1.25rem] border border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.12)] px-4 py-3 text-sm leading-7 text-[#86efac]">
                <div className="flex items-start gap-2">
                  <Wifi size={17} className="mt-1 shrink-0" />
                  <p>
                    Online. This workspace was last saved on{" "}
                    <b>{formatCachedAt(cachedAt)}</b>.
                    {refreshing ? " Refreshing latest workspace updates…" : ""}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/client/dashboard"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to Client Hub
              </Link>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={!online || refreshing}
                  className="btn btn-outline disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={refreshing ? "animate-spin" : ""}
                  />
                  {refreshing ? "Refreshing..." : "Refresh"}
                </button>

                <Link href="/contact" prefetch={false} className="btn btn-outline">
                  <ClipboardList size={16} />
                  Request Help
                </Link>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={pdfBusy}
                  className="btn btn-primary"
                >
                  <Download size={16} />
                  {pdfBusy ? "Preparing PDF..." : "Download Workspace PDF"}
                </button>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-10">
                  <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />

                  <div className="relative">
                    <div className="eyebrow">
                      <ShieldCheck size={15} />
                      AdminHub Global • Client Workspace
                    </div>

                    <h1 className="max-w-[15ch]">{title}</h1>

                    <p className="mt-4 max-w-[62ch] text-base leading-8 text-[var(--text-secondary)]">
                      View your project status, delivery stage, onboarding
                      requests, files, proposal links, progress updates, support
                      notes, and project messages from AdminHub Global.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <MiniStat
                        icon={<UserRound size={16} />}
                        label="Client"
                        value={projectRecord.client_name || "Not provided"}
                      />
                      <MiniStat
                        icon={<Mail size={16} />}
                        label="Account"
                        value={clientEmail}
                      />
                      <MiniStat
                        icon={<Workflow size={16} />}
                        label="Stage"
                        value={niceLabel(getProjectStage(projectRecord))}
                      />
                      <MiniStat
                        icon={<BadgeCheck size={16} />}
                        label="Status"
                        value={niceLabel(projectRecord.status)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <LayoutDashboard size={15} />
                    Workspace Summary
                  </div>

                  <h2 className="mt-2 text-2xl">Project details</h2>

                  <div className="mt-5 grid gap-3">
                    <SnapshotRow
                      label="Package / Solution"
                      value={niceLabel(getProjectPackage(projectRecord))}
                    />
                    <SnapshotRow
                      label="Industry"
                      value={niceLabel(projectRecord.industry)}
                    />
                    <SnapshotRow
                      label="Onboarding"
                      value={niceLabel(projectRecord.onboarding_status)}
                    />
                    <SnapshotRow
                      label="Support"
                      value={niceLabel(
                        projectRecord.support_status ||
                          projectRecord.recurring_status
                      )}
                    />
                  </div>

                  {projectRecord.documentUrl ? (
                    <a
                      href={projectRecord.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 flex items-start justify-between gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 transition hover:bg-[rgba(77,163,255,0.08)]"
                    >
                      <div>
                        <div className="text-sm font-extrabold text-[var(--text-primary)]">
                          Workspace File
                        </div>
                        <div className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                          {projectRecord.documentName ||
                            "Open uploaded document"}
                        </div>
                      </div>
                      <ExternalLink
                        size={18}
                        className="mt-1 shrink-0 text-[var(--brand-primary)]"
                      />
                    </a>
                  ) : null}

                  {projectRecord.proposalUrl ? (
                    <a
                      href={projectRecord.proposalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 flex items-start justify-between gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 transition hover:bg-[rgba(77,163,255,0.08)]"
                    >
                      <div>
                        <div className="text-sm font-extrabold text-[var(--text-primary)]">
                          Proposal / Scope File
                        </div>
                        <div className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                          {projectRecord.proposalName ||
                            "Open proposal or project scope"}
                        </div>
                      </div>
                      <ExternalLink
                        size={18}
                        className="mt-1 shrink-0 text-[var(--brand-primary)]"
                      />
                    </a>
                  ) : null}

                  {projectRecord.resource_link ? (
                    <a
                      href={projectRecord.resource_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 flex items-start justify-between gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 transition hover:bg-[rgba(77,163,255,0.08)]"
                    >
                      <div>
                        <div className="text-sm font-extrabold text-[var(--text-primary)]">
                          Shared Resource Link
                        </div>
                        <div className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                          Open linked document, preview, or shared file.
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

            <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <InfoCard title="Latest Update">
                <Read
                  label="Progress Update"
                  value={
                    projectRecord.progress_update ||
                    "No progress update has been added yet."
                  }
                />

                <Read
                  label="Onboarding / Requested Items"
                  value={
                    projectRecord.onboarding_requests ||
                    projectRecord.required_documents ||
                    "No onboarding request has been added yet."
                  }
                />

                <Read label="Next Steps" value={projectRecord.next_steps} />
                <Read
                  label="Support Summary"
                  value={projectRecord.support_summary}
                />
              </InfoCard>

              <InfoCard title="Project Information">
                <Read
                  label="Client Type"
                  value={niceLabel(projectRecord.client_type)}
                />
                <Read
                  label="Business / Organisation"
                  value={
                    projectRecord.business_name ||
                    projectRecord.business ||
                    projectRecord.organisation
                  }
                />
                <Read
                  label="Country / Region"
                  value={
                    projectRecord.country ||
                    projectRecord.region ||
                    projectRecord.city_town
                  }
                />
                <Read label="Industry" value={projectRecord.industry} />
                <Read
                  label="Package / Solution"
                  value={getProjectPackage(projectRecord)}
                />
                <Read label="Build Notes" value={projectRecord.build_notes} />
              </InfoCard>
            </section>

            <section className="mt-8">
              <div className="mb-4">
                <div className="eyebrow">
                  <MessageCircle size={15} />
                  Messages
                </div>
                <h2 className="mt-2 text-2xl">Continue the conversation</h2>
                <p className="mt-2 max-w-[65ch] text-sm leading-7 text-[var(--text-secondary)]">
                  Send updates, questions, documents, or links directly inside
                  this Client Hub workspace.
                </p>
              </div>

              {online ? (
                <ChatPanel
                  projectId={id}
                  senderName={projectRecord.client_name || "Client"}
                  canDeleteAll={false}
                  brand={{
                    primary: "#4da3ff",
                    accent: "#18c7b8",
                  }}
                />
              ) : (
                <div className="frame-gold p-6 text-sm leading-7 text-[var(--text-secondary)]">
                  <b className="text-[var(--text-primary)]">
                    Messages are paused offline.
                  </b>{" "}
                  You can still read this saved workspace summary and download
                  the workspace PDF. Reconnect to the internet to send messages
                  or view the latest conversation.
                </div>
              )}
            </section>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Contact policy:</b>{" "}
              This Client Hub supports project updates, files, messaging, and
              support visibility. If access or follow-up is needed outside this
              workspace, use the structured inquiry page so identity and context
              are recorded before private follow-up.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="card-outline-gold h-full">
      <div className="card-inner md:p-8">
        <div className="eyebrow mb-0">
          <FileText size={15} />
          {title}
        </div>

        <div className="mt-5 space-y-4">{children}</div>
      </div>
    </section>
  );
}

function Read({ label, value }: { label: string; value: unknown }) {
  const text =
    value && value.toString().trim().length > 0 ? value.toString().trim() : "—";

  return (
    <div>
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-primary)]">
        {text}
      </div>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
      <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {icon}
        {label}
      </div>
      <div className="mt-2 break-words text-sm font-semibold leading-7 text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value?: string }) {
  const text = value && value.trim().length > 0 ? value.trim() : "—";

  return (
    <div className="rounded-[1rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
        {text}
      </div>
    </div>
  );
}