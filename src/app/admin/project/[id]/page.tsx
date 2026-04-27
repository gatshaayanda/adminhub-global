"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import jsPDF from "jspdf";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Clock3,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  Mail,
  Network,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import AdminHubLoader from "@/components/AdminHubLoader";
import ChatPanel from "@/components/ChatPanel";

type ProjectRecord = {
  project_name?: string;

  client_name?: string;
  client_email?: string;
  client_phone?: string;
  client_type?: string;

  business?: string;
  business_name?: string;
  company_name?: string;
  country_region?: string;
  city_town?: string;

  source?: string;
  agent_name?: string;
  agent_email?: string;

  project_type?: string;
  solution_type?: string;
  service_type?: string;
  package_selected?: string;
  package?: string;
  quote_package?: string;

  pipeline_stage?: string;
  workflow_stage?: string;
  lead_stage?: string;
  stage?: string;
  status?: string;

  intake_summary?: string;
  business_goals?: string;
  pain_points?: string;
  requested_pages?: string;
  requested_features?: string;
  branding_notes?: string;

  proof_status?: string;
  proposal_status?: string;
  contract_status?: string;
  payment_status?: string;

  onboarding_checklist?: string;
  required_assets?: string;
  required_documents?: string;

  support_plan?: string;
  support_status?: string;
  monthly_support_amount?: string;
  support_summary?: string;

  commission_terms?: string;
  commission_status?: string;

  portal_access?: boolean;
  admin_panel?: boolean;

  admin_notes?: string;
  progress_update?: string;
  latest_update?: string;
  next_action?: string;
  resource_link?: string;

  documentUrl?: string;
  documentName?: string;
  documentType?: string;

  // Compatibility fields from older project/client pages
  request_type?: string;
  cover_type?: string;
  product_interest?: string;
  industry?: string;
  current_insurer?: string;
  policy_number?: string;
  risk_items?: string;
};

function niceLabel(value?: string) {
  if (!value) return "—";

  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
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

  return `adminhub-global-project-${safeName || id}.pdf`;
}

function firstValue(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim() || "";
}

const LOGO_PATH = "/logo.png";

const BRAND = {
  blue: [77, 163, 255] as [number, number, number],
  cyan: [24, 199, 184] as [number, number, number],
  navy: [6, 10, 18] as [number, number, number],
  panel: [15, 23, 42] as [number, number, number],
  softPanel: [232, 240, 255] as [number, number, number],
  pale: [244, 248, 255] as [number, number, number],
  text: [15, 23, 42] as [number, number, number],
  muted: [89, 103, 130] as [number, number, number],
};

const ADMINHUB_CONTACT = {
  publicRoute: "/contact",
  note: "Structured inquiry only. Direct personal phone and email details are not published publicly.",
  company: "AdminHub (Pty) Ltd",
  product: "AdminHub Global",
};

async function loadImageAsDataUrl(src: string) {
  try {
    const response = await fetch(src);
    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Could not load PDF logo:", error);
    return "";
  }
}

async function generateProjectSummaryPdf({
  id,
  record,
  displayName,
  portalAccess,
}: {
  id: string;
  record: ProjectRecord;
  displayName: string;
  portalAccess: boolean;
}) {
  const pdf = new jsPDF("p", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const marginX = 16;
  const maxWidth = pageWidth - marginX * 2;
  let y = 14;

  const logoDataUrl = await loadImageAsDataUrl(LOGO_PATH);

  const addPageIfNeeded = (needed = 18) => {
    if (y + needed > pageHeight - 24) {
      pdf.addPage();
      y = 18;
    }
  };

  const addBrandLine = () => {
    pdf.setDrawColor(...BRAND.blue);
    pdf.setLineWidth(0.7);
    pdf.line(marginX, y, pageWidth - marginX, y);
    y += 8;
  };

  const addSectionTitle = (title: string) => {
    addPageIfNeeded(18);

    y += 3;

    pdf.setFillColor(...BRAND.navy);
    pdf.roundedRect(marginX, y, maxWidth, 9, 2, 2, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(title.toUpperCase(), marginX + 4, y + 6.2);

    y += 14;
  };

  const addField = (label: string, value: unknown) => {
    const cleanValue = cleanPdfText(value);
    const lines = pdf.splitTextToSize(cleanValue, maxWidth - 8);
    const neededHeight = 12 + lines.length * 5;

    addPageIfNeeded(neededHeight);

    pdf.setFillColor(...BRAND.pale);
    pdf.setDrawColor(204, 219, 245);
    pdf.roundedRect(marginX, y, maxWidth, neededHeight, 2, 2, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...BRAND.blue);
    pdf.text(label.toUpperCase(), marginX + 4, y + 5.5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...BRAND.text);
    pdf.text(lines, marginX + 4, y + 11);

    y += neededHeight + 3;
  };

  const addFooter = () => {
    const pageCount = pdf.getNumberOfPages();

    for (let page = 1; page <= pageCount; page += 1) {
      pdf.setPage(page);

      pdf.setDrawColor(204, 219, 245);
      pdf.setLineWidth(0.3);
      pdf.line(marginX, pageHeight - 18, pageWidth - marginX, pageHeight - 18);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...BRAND.muted);

      pdf.text(
        "AdminHub (Pty) Ltd | AdminHub Global | Custom PWA Framework | Structured inquiry only",
        marginX,
        pageHeight - 12
      );

      pdf.text(
        `Public inquiry route: ${ADMINHUB_CONTACT.publicRoute} | Page ${page} of ${pageCount}`,
        marginX,
        pageHeight - 8
      );
    }
  };

  pdf.setFillColor(...BRAND.pale);
  pdf.rect(0, 0, pageWidth, 62, "F");

  if (logoDataUrl) {
    pdf.addImage(logoDataUrl, "PNG", 54, 8, 102, 34);
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(...BRAND.navy);
    pdf.text("ADMINHUB GLOBAL", pageWidth / 2, 22, { align: "center" });

    pdf.setFontSize(9);
    pdf.setTextColor(...BRAND.blue);
    pdf.text("CUSTOM PWA FRAMEWORK", pageWidth / 2, 29, { align: "center" });
  }

  y = 48;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(...BRAND.text);
  pdf.text("Project Workspace Summary", pageWidth / 2, y, {
    align: "center",
  });

  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(
    "Internal project record generated from AdminHub Global Control.",
    pageWidth / 2,
    y,
    { align: "center" }
  );

  y += 7;

  addBrandLine();

  pdf.setFillColor(...BRAND.softPanel);
  pdf.setDrawColor(204, 219, 245);
  pdf.roundedRect(marginX, y, maxWidth, 28, 3, 3, "FD");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.setTextColor(...BRAND.text);
  pdf.text(cleanPdfText(displayName), marginX + 5, y + 8);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(...BRAND.muted);
  pdf.text(
    `Generated: ${new Date().toLocaleString("en-BW")}`,
    marginX + 5,
    y + 15
  );
  pdf.text(`Project ID: ${id}`, marginX + 5, y + 20);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...BRAND.blue);
  pdf.text(
    `Stage: ${cleanPdfText(
      niceLabel(
        firstValue(
          record.pipeline_stage,
          record.workflow_stage,
          record.lead_stage,
          record.stage
        )
      )
    )}`,
    pageWidth - marginX - 5,
    y + 8,
    { align: "right" }
  );
  pdf.text(
    `Status: ${cleanPdfText(niceLabel(record.status))}`,
    pageWidth - marginX - 5,
    y + 15,
    { align: "right" }
  );
  pdf.text(
    `Package: ${cleanPdfText(
      niceLabel(
        firstValue(
          record.package_selected,
          record.package,
          record.quote_package,
          record.product_interest
        )
      )
    )}`,
    pageWidth - marginX - 5,
    y + 22,
    { align: "right" }
  );

  y += 38;

  addSectionTitle("AdminHub Contact Policy");
  addField("Company", ADMINHUB_CONTACT.company);
  addField("Product", ADMINHUB_CONTACT.product);
  addField("Public Inquiry Route", ADMINHUB_CONTACT.publicRoute);
  addField("Contact Handling Note", ADMINHUB_CONTACT.note);

  addSectionTitle("Client & Business Overview");
  addField("Project Name", record.project_name || displayName);
  addField("Client Name", record.client_name);
  addField("Client Email", record.client_email);
  addField("Client Phone", record.client_phone);
  addField("Client Type", niceLabel(record.client_type));
  addField(
    "Business / Organisation",
    firstValue(record.business_name, record.business, record.company_name)
  );
  addField("Country / Region", firstValue(record.country_region, record.city_town));

  addSectionTitle("Lead Source & Partner Attribution");
  addField("Source", niceLabel(record.source));
  addField("Agent / Partner Name", record.agent_name);
  addField("Agent / Partner Email", record.agent_email);
  addField("Commission Terms", record.commission_terms);
  addField("Commission Status", niceLabel(record.commission_status));

  addSectionTitle("Project & Pipeline Details");
  addField(
    "Project Type",
    niceLabel(
      firstValue(record.project_type, record.solution_type, record.service_type)
    )
  );
  addField(
    "Package Selected",
    niceLabel(
      firstValue(
        record.package_selected,
        record.package,
        record.quote_package,
        record.product_interest
      )
    )
  );
  addField(
    "Pipeline Stage",
    niceLabel(
      firstValue(
        record.pipeline_stage,
        record.workflow_stage,
        record.lead_stage,
        record.stage
      )
    )
  );
  addField("Status", niceLabel(record.status));
  addField("Client Hub Access", portalAccess ? "Yes" : "No");

  addSectionTitle("Intake & Scope");
  addField("Intake Summary", firstValue(record.intake_summary, record.support_summary));
  addField("Business Goals", record.business_goals);
  addField("Pain Points", record.pain_points);
  addField("Requested Pages / Areas", record.requested_pages);
  addField("Requested Features / Modules", record.requested_features);
  addField("Branding Notes", record.branding_notes);

  addSectionTitle("Commercial & Delivery Tracking");
  addField("Proof Status", niceLabel(record.proof_status));
  addField("Proposal Status", niceLabel(record.proposal_status));
  addField("Contract Status", niceLabel(record.contract_status));
  addField("Payment Status", niceLabel(record.payment_status));
  addField("Support Plan", niceLabel(record.support_plan));
  addField("Support Status", niceLabel(record.support_status));
  addField("Monthly Support Amount", record.monthly_support_amount);

  addSectionTitle("Onboarding, Assets & Files");
  addField("Onboarding Checklist", record.onboarding_checklist);
  addField(
    "Required Assets",
    firstValue(record.required_assets, record.required_documents)
  );
  addField("Saved File", record.documentName || record.documentUrl);
  addField("Document Type", record.documentType);
  addField("Document URL", record.documentUrl);
  addField("Shared Resource Link", record.resource_link);

  addSectionTitle("Updates & Notes");
  addField(
    "Client-facing Progress Update",
    firstValue(record.progress_update, record.latest_update, record.next_action)
  );
  addField("Admin Notes", record.admin_notes);

  addSectionTitle("Important Note");
  addField(
    "Disclaimer",
    "This document is an internal AdminHub Global project workspace summary. It supports project coordination, lead tracking, delivery, Client Hub visibility, and managed support follow-up. Public-facing contact should remain structured through the inquiry flow, not direct personal contact details."
  );

  addFooter();

  pdf.save(pdfFileName(displayName, id));
}

export default function ViewProjectPage() {
  const { id } = useParams() as { id: string };

  const [record, setRecord] = useState<ProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const snap = await getDoc(doc(firestore, "projects", id));
        if (!snap.exists()) throw new Error("Project record not found.");

        setRecord(snap.data() as ProjectRecord);
      } catch (e: any) {
        setError(e?.message || "Failed to load project record.");
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const displayName = useMemo(() => {
    if (!record) return "AdminHub Global Project";

    return (
      record.project_name?.trim() ||
      record.business_name?.trim() ||
      record.business?.trim() ||
      record.company_name?.trim() ||
      record.client_name?.trim() ||
      record.client_email?.trim() ||
      "Unnamed AdminHub Global Project"
    );
  }, [record]);

  const portalAccess = useMemo(() => {
    if (!record) return false;
    return !!record.portal_access || !!record.admin_panel;
  }, [record]);

  const projectType = useMemo(() => {
    if (!record) return "—";

    return niceLabel(
      firstValue(record.project_type, record.solution_type, record.service_type)
    );
  }, [record]);

  const packageSelected = useMemo(() => {
    if (!record) return "—";

    return niceLabel(
      firstValue(
        record.package_selected,
        record.package,
        record.quote_package,
        record.product_interest
      )
    );
  }, [record]);

  const pipelineStage = useMemo(() => {
    if (!record) return "—";

    return niceLabel(
      firstValue(
        record.pipeline_stage,
        record.workflow_stage,
        record.lead_stage,
        record.stage
      )
    );
  }, [record]);

  const handleDownloadPdf = async () => {
    if (!record) return;

    await generateProjectSummaryPdf({
      id,
      record,
      displayName,
      portalAccess,
    });
  };

  if (loading) return <AdminHubLoader />;

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <section className="section-shell">
          <div className="container">
            <div className="mx-auto max-w-4xl">
              <div className="mb-5">
                <Link
                  href="/admin/project"
                  prefetch={false}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
                >
                  <ArrowLeft size={16} />
                  Back to Project Workspace
                </Link>
              </div>

              <div className="frame-gold p-8 text-center">
                <h1 className="text-2xl">Unable to open project record</h1>
                <p className="mt-3 text-sm leading-7 text-red-300">{error}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!record) return null;

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
                href="/admin/project"
                prefetch={false}
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-primary)] transition hover:opacity-80"
              >
                <ArrowLeft size={16} />
                Back to Project Workspace
              </Link>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="btn btn-primary"
                >
                  <Download size={16} />
                  Download Project PDF
                </button>

                <Link
                  href={`/admin/project/${id}/edit`}
                  prefetch={false}
                  className="btn btn-outline"
                >
                  <Edit3 size={16} />
                  Edit Project
                </Link>
              </div>
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

                    <h1 className="max-w-[16ch]">{displayName}</h1>

                    <p className="mt-4 max-w-[64ch] text-base leading-8 text-[var(--text-secondary)]">
                      Review the lead, proof sprint, onboarding, build,
                      proposal, Client Hub, messaging, files, and recurring
                      support details for this AdminHub Global project.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <MiniStat
                        icon={<UserRound size={16} />}
                        label="Client"
                        value={record.client_name?.trim() || "Not provided"}
                      />
                      <MiniStat
                        icon={<BriefcaseBusiness size={16} />}
                        label="Business"
                        value={
                          firstValue(
                            record.business_name,
                            record.business,
                            record.company_name
                          ) || "Not provided"
                        }
                      />
                      <MiniStat
                        icon={<BadgeCheck size={16} />}
                        label="Stage"
                        value={pipelineStage}
                      />
                      <MiniStat
                        icon={<ShieldCheck size={16} />}
                        label="Status"
                        value={niceLabel(record.status)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <LayoutDashboard size={15} />
                    Project snapshot
                  </div>

                  <h2 className="mt-2 text-2xl">Delivery details</h2>

                  <div className="mt-5 grid gap-3">
                    <SnapshotRow label="Project Type" value={projectType} />
                    <SnapshotRow
                      label="Package Selected"
                      value={packageSelected}
                    />
                    <SnapshotRow label="Pipeline Stage" value={pipelineStage} />
                    <SnapshotRow
                      label="Lead Source"
                      value={niceLabel(record.source)}
                    />
                    <SnapshotRow
                      label="Country / Region"
                      value={firstValue(record.country_region, record.city_town)}
                    />
                    <SnapshotRow
                      label="Client Hub Access"
                      value={portalAccess ? "Yes" : "No"}
                    />
                  </div>

                  {record.documentUrl ? (
                    <a
                      href={record.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 flex items-start justify-between gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 transition hover:bg-[rgba(77,163,255,0.08)]"
                    >
                      <div>
                        <div className="text-sm font-extrabold text-[var(--text-primary)]">
                          Saved Project File
                        </div>
                        <div className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                          {record.documentName ||
                            "Open uploaded PDF, image, or scope file"}
                        </div>
                        {record.documentType ? (
                          <div className="mt-1 text-xs text-[var(--text-muted)]">
                            {record.documentType}
                          </div>
                        ) : null}
                      </div>
                      <ExternalLink
                        size={18}
                        className="mt-1 shrink-0 text-[var(--brand-primary)]"
                      />
                    </a>
                  ) : null}

                  {record.resource_link ? (
                    <a
                      href={record.resource_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 flex items-start justify-between gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4 transition hover:bg-[rgba(77,163,255,0.08)]"
                    >
                      <div>
                        <div className="text-sm font-extrabold text-[var(--text-primary)]">
                          Shared Resource Link
                        </div>
                        <div className="mt-1 text-sm leading-7 text-[var(--text-secondary)]">
                          Open the linked Drive file, document, preview, or
                          project resource.
                        </div>
                      </div>
                      <ExternalLink
                        size={18}
                        className="mt-1 shrink-0 text-[var(--brand-primary)]"
                      />
                    </a>
                  ) : null}

                  {firstValue(
                    record.progress_update,
                    record.latest_update,
                    record.next_action
                  ) ? (
                    <div className="mt-5 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                      <p className="text-sm font-extrabold text-[var(--text-primary)]">
                        Client-facing Progress Update
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                        {firstValue(
                          record.progress_update,
                          record.latest_update,
                          record.next_action
                        )}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <section className="mt-8 space-y-6">
              <ChatPanel
                projectId={id}
                senderName="AdminHub Global Team"
                canDeleteAll={true}
                brand={{
                  primary: "#1d4ed8",
                  accent: "#4da3ff",
                }}
              />
            </section>

            <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1fr]">
              <InfoCard title="Client & Opportunity">
                <Read label="Project Name" value={record.project_name} />
                <Read label="Client Name" value={record.client_name} />
                <Read label="Client Email" value={record.client_email} />
                <Read label="Client Phone" value={record.client_phone} />
                <Read
                  label="Client Type"
                  value={niceLabel(record.client_type)}
                />
                <Read
                  label="Business / Organisation"
                  value={firstValue(
                    record.business_name,
                    record.business,
                    record.company_name
                  )}
                />
                <Read
                  label="Country / Region"
                  value={firstValue(record.country_region, record.city_town)}
                />
                <Read label="Lead Source" value={niceLabel(record.source)} />
                <Read label="Agent / Partner Name" value={record.agent_name} />
                <Read label="Agent / Partner Email" value={record.agent_email} />
                <Read label="Commission Terms" value={record.commission_terms} />
                <Read
                  label="Commission Status"
                  value={niceLabel(record.commission_status)}
                />
              </InfoCard>

              <InfoCard title="Project, Proof & Commercial Tracking">
                <Read label="Project Type" value={projectType} />
                <Read label="Package Selected" value={packageSelected} />
                <Read label="Pipeline Stage" value={pipelineStage} />
                <Read label="Status" value={niceLabel(record.status)} />
                <Read
                  label="Proof Status"
                  value={niceLabel(record.proof_status)}
                />
                <Read
                  label="Proposal Status"
                  value={niceLabel(record.proposal_status)}
                />
                <Read
                  label="Contract Status"
                  value={niceLabel(record.contract_status)}
                />
                <Read
                  label="Payment Status"
                  value={niceLabel(record.payment_status)}
                />
                <Read
                  label="Support Plan"
                  value={niceLabel(record.support_plan)}
                />
                <Read
                  label="Support Status"
                  value={niceLabel(record.support_status)}
                />
                <Read
                  label="Monthly Support Amount"
                  value={record.monthly_support_amount}
                />
                <Read
                  label="Client Hub Access"
                  value={portalAccess ? "Yes" : "No"}
                />
              </InfoCard>

              <InfoCard title="Intake & Scope">
                <Read
                  label="Intake Summary"
                  value={firstValue(record.intake_summary, record.support_summary)}
                />
                <Read label="Business Goals" value={record.business_goals} />
                <Read label="Pain Points" value={record.pain_points} />
                <Read
                  label="Requested Pages / Areas"
                  value={record.requested_pages}
                />
                <Read
                  label="Requested Features / Modules"
                  value={record.requested_features}
                />
                <Read label="Branding Notes" value={record.branding_notes} />
                <Read label="Industry" value={record.industry} />
                <Read
                  label="Legacy Request Type"
                  value={niceLabel(record.request_type)}
                />
                <Read
                  label="Legacy Product Interest"
                  value={record.product_interest}
                />
              </InfoCard>

              <InfoCard title="Onboarding, Assets & Notes">
                <Read
                  label="Onboarding Checklist"
                  value={record.onboarding_checklist}
                />
                <Read
                  label="Required Assets"
                  value={firstValue(
                    record.required_assets,
                    record.required_documents
                  )}
                />
                <Read
                  label="Client-facing Progress Update"
                  value={firstValue(
                    record.progress_update,
                    record.latest_update,
                    record.next_action
                  )}
                />
                <Read label="Admin Notes" value={record.admin_notes} />
                <Read
                  label="Saved Project File"
                  value={record.documentName || record.documentUrl}
                />
                <Read label="Document Type" value={record.documentType} />
                <Read label="Shared Resource Link" value={record.resource_link} />
              </InfoCard>
            </section>

            <div className="mt-8 frame-gold p-5 text-sm leading-7 text-[var(--text-secondary)]">
              <b className="text-[var(--text-primary)]">Admin note:</b> this
              page is now an AdminHub Global project workspace, not an insurance
              case page. It preserves the existing Firestore project record,
              ChatPanel wiring, file links, PDF export, and edit route while
              changing the labels, styling, and data interpretation for the
              lead → proof → convert → onboard → build → monthly support
              workflow.
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
  children: React.ReactNode;
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

function Read({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
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
  icon: React.ReactNode;
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

function SnapshotRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
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