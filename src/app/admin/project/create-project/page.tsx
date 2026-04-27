"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  FileUp,
  FolderPlus,
  Globe2,
  LayoutDashboard,
  Loader2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import { firestore } from "@/utils/firebaseConfig";
import { uploadFiles } from "@/utils/uploadthing";

type UploadThingResult = {
  url?: string;
  ufsUrl?: string;
  appUrl?: string;
  name?: string;
  type?: string;
};

type ProjectForm = {
  project_name: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  client_type: string;
  business_name: string;
  country_region: string;

  source: string;
  agent_name: string;
  agent_email: string;

  project_type: string;
  package_selected: string;
  pipeline_stage: string;
  status: string;

  intake_summary: string;
  business_goals: string;
  pain_points: string;
  requested_pages: string;
  requested_features: string;
  branding_notes: string;

  proof_status: string;
  proposal_status: string;
  contract_status: string;
  payment_status: string;

  onboarding_checklist: string;
  required_assets: string;
  support_plan: string;
  support_status: string;
  monthly_support_amount: string;

  commission_terms: string;
  commission_status: string;

  portal_access: boolean;
  admin_notes: string;
  progress_update: string;
  resource_link: string;
};

const initialForm: ProjectForm = {
  project_name: "",
  client_name: "",
  client_email: "",
  client_phone: "",
  client_type: "business",
  business_name: "",
  country_region: "",

  source: "direct",
  agent_name: "",
  agent_email: "",

  project_type: "business-pwa",
  package_selected: "business-pwa",
  pipeline_stage: "lead",
  status: "new inquiry",

  intake_summary: "",
  business_goals: "",
  pain_points: "",
  requested_pages: "",
  requested_features: "",
  branding_notes: "",

  proof_status: "not started",
  proposal_status: "not sent",
  contract_status: "not sent",
  payment_status: "not paid",

  onboarding_checklist: "",
  required_assets: "",
  support_plan: "not selected",
  support_status: "not active",
  monthly_support_amount: "",

  commission_terms: "",
  commission_status: "not applicable",

  portal_access: false,
  admin_notes: "",
  progress_update: "",
  resource_link: "",
};

function getUploadUrl(uploaded?: UploadThingResult) {
  return uploaded?.url || uploaded?.ufsUrl || uploaded?.appUrl || "";
}

export default function CreateProjectPage() {
  const router = useRouter();

  const [form, setForm] = useState<ProjectForm>(initialForm);
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = (field: keyof ProjectForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const clearForm = () => {
    setForm(initialForm);
    setInitialFile(null);
    setFileInputKey((prev) => prev + 1);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    setSuccess(false);
    setSaving(true);

    try {
      let uploadedFileUrl = "";
      let uploadedFileName = "";
      let uploadedFileType = "";

      if (initialFile) {
        const uploaded = await uploadFiles("fileUploader" as any, {
          files: [initialFile],
        });

        const firstUpload = uploaded?.[0] as UploadThingResult | undefined;

        uploadedFileUrl = getUploadUrl(firstUpload);
        uploadedFileName = firstUpload?.name || initialFile.name || "";
        uploadedFileType = firstUpload?.type || initialFile.type || "";

        if (!uploadedFileUrl) {
          console.log("UploadThing response:", uploaded);
          throw new Error("File uploaded, but no file URL was returned.");
        }
      }

      const cleanProjectName =
        form.project_name.trim() ||
        form.business_name.trim() ||
        `${form.client_name.trim() || "Client"} AdminHub Project`;

      const newProjectRef = await addDoc(collection(firestore, "projects"), {
        ...form,
        project_name: cleanProjectName,

        // Compatibility with the existing framework/client pages
        business: form.business_name,
        company_name: form.business_name,
        city_town: form.country_region,
        request_type: form.project_type,
        cover_type: form.project_type,
        product_interest: form.package_selected,
        stage: form.pipeline_stage,
        workflow_stage: form.pipeline_stage,
        admin_panel: form.portal_access,

        // AdminHub Global workflow aliases
        solution_type: form.project_type,
        service_type: form.project_type,
        package: form.package_selected,
        quote_package: form.package_selected,
        lead_stage: form.pipeline_stage,
        next_action: form.progress_update,
        latest_update: form.progress_update,
        support_summary: form.intake_summary,
        required_documents: form.required_assets,

        // Uploaded intake / profile / proposal support
        documentUrl: uploadedFileUrl,
        documentName: uploadedFileName,
        documentType: uploadedFileType,

        // Admin ownership/security-rule compatibility
        admin_id: "admin",

        // Timestamp compatibility
        created_at: serverTimestamp(),
        createdAt: serverTimestamp(),
        updated_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setMessage("AdminHub Global project record created successfully.");
      setSuccess(true);
      clearForm();

      router.push(`/admin/project/${newProjectRef.id}`);
    } catch (err: any) {
      setMessage(
        `Error: ${err?.message || "Failed to create AdminHub Global project."}`
      );
      setSuccess(false);
      setSaving(false);
    }
  };

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
          <div className="mx-auto max-w-5xl">
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

            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="card-elevated overflow-hidden">
                <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(77,163,255,0.16)_0%,rgba(15,23,42,0.96)_48%,rgba(24,199,184,0.12)_100%)] p-6 md:p-10">
                  <div className="pointer-events-none absolute inset-0 panel-grid opacity-40" />

                  <div className="relative">
                    <div className="eyebrow">
                      <FolderPlus size={15} />
                      AdminHub Global • New Project Record
                    </div>

                    <h1 className="max-w-[13ch]">
                      Create a new proof, build, or support workspace.
                    </h1>

                    <p className="mt-4 max-w-[64ch] text-base leading-8 text-[var(--text-secondary)]">
                      Use this form to capture an AdminHub Global lead after
                      qualification, a 48-hour live proof sprint, a full PWA
                      implementation, or an active managed support client.
                    </p>

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                        <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                          <Globe2
                            size={16}
                            className="text-[var(--brand-primary)]"
                          />
                          Best use
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                          Create one clean record per client opportunity so
                          proof, onboarding, delivery, messaging, files, and
                          support stay connected.
                        </p>
                      </div>

                      <div className="rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] p-4">
                        <p className="inline-flex items-center gap-2 text-sm font-extrabold text-[var(--text-primary)]">
                          <ShieldCheck
                            size={16}
                            className="text-[var(--brand-primary)]"
                          />
                          Client-facing note
                        </p>
                        <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)]">
                          The progress update can appear inside the Client Hub,
                          so keep that field clear, professional, and safe to
                          show externally.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card-outline-gold self-start">
                <div className="card-inner md:p-8">
                  <div className="eyebrow mb-0">
                    <LayoutDashboard size={15} />
                    Intake reminder
                  </div>

                  <h2 className="mt-2 text-2xl">Before creating</h2>

                  <ul className="mt-5 space-y-3">
                    {[
                      "Confirm whether this came from an agent, partner, referral, or direct inquiry.",
                      "Capture the selected offer: 48-hour proof, Business PWA, or Operations PWA.",
                      "Separate internal admin notes from client-facing progress updates.",
                      "Upload the intake PDF, company profile, proposal, or reference file if available.",
                      "Enable Client Hub access only when the record is ready to be visible to the client.",
                    ].map((item) => (
                      <li
                        key={item}
                        className="flex gap-2 text-sm leading-7 text-[var(--text-secondary)]"
                      >
                        <CheckCircle2
                          size={16}
                          className="mt-[5px] shrink-0 text-[var(--brand-primary)]"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <section className="mt-8">
              <form onSubmit={handleSubmit} className="card-outline-gold">
                <div className="card-inner space-y-6 md:p-8">
                  <FormSection
                    eyebrow="Client and business"
                    title="Who is this project for?"
                    icon={<BriefcaseBusiness size={15} />}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Project Name"
                        value={form.project_name}
                        onChange={(v) => handleChange("project_name", v)}
                        placeholder="Example: Northstar Advisory Client Portal"
                      />

                      <Field
                        label="Client Full Name"
                        value={form.client_name}
                        onChange={(v) => handleChange("client_name", v)}
                        required
                        placeholder="Client or decision-maker name"
                      />

                      <Field
                        label="Client Email"
                        type="email"
                        value={form.client_email}
                        onChange={(v) => handleChange("client_email", v)}
                        required
                        placeholder="Client email"
                      />

                      <Field
                        label="Client Phone"
                        value={form.client_phone}
                        onChange={(v) => handleChange("client_phone", v)}
                        placeholder="Client phone / WhatsApp"
                      />

                      <div>
                        <label className="label">Client Type</label>
                        <select
                          value={form.client_type}
                          onChange={(e) =>
                            handleChange("client_type", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="business">Business / SME</option>
                          <option value="agent">Agent / Sales Partner</option>
                          <option value="organisation">Organisation</option>
                          <option value="individual">Individual Founder</option>
                        </select>
                      </div>

                      <Field
                        label="Business / Organisation"
                        value={form.business_name}
                        onChange={(v) => handleChange("business_name", v)}
                        placeholder="Business or organisation name"
                      />

                      <Field
                        label="Country / Region"
                        value={form.country_region}
                        onChange={(v) => handleChange("country_region", v)}
                        placeholder="Example: UK, Canada, EU, Botswana"
                      />
                    </div>
                  </FormSection>

                  <FormSection
                    eyebrow="Source and attribution"
                    title="Where did the opportunity come from?"
                    icon={<Users size={15} />}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="label">Lead Source</label>
                        <select
                          value={form.source}
                          onChange={(e) => handleChange("source", e.target.value)}
                          className="select mt-2"
                        >
                          <option value="direct">Direct Inquiry</option>
                          <option value="agent">Agent / Sales Partner</option>
                          <option value="commissioncrowd">CommissionCrowd</option>
                          <option value="referral">Referral</option>
                          <option value="existing-client">Existing Client</option>
                          <option value="manual-entry">Manual Entry</option>
                        </select>
                      </div>

                      <Field
                        label="Agent / Partner Name"
                        value={form.agent_name}
                        onChange={(v) => handleChange("agent_name", v)}
                        placeholder="If agent-sourced"
                      />

                      <Field
                        label="Agent / Partner Email"
                        type="email"
                        value={form.agent_email}
                        onChange={(v) => handleChange("agent_email", v)}
                        placeholder="If agent-sourced"
                      />

                      <Field
                        label="Commission Terms"
                        value={form.commission_terms}
                        onChange={(v) => handleChange("commission_terms", v)}
                        placeholder="Example: 10% implementation + 5% support"
                      />

                      <div>
                        <label className="label">Commission Status</label>
                        <select
                          value={form.commission_status}
                          onChange={(e) =>
                            handleChange("commission_status", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="not applicable">Not Applicable</option>
                          <option value="pending">Pending</option>
                          <option value="eligible">Eligible</option>
                          <option value="approved">Approved</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection
                    eyebrow="Offer and pipeline"
                    title="What are we selling or delivering?"
                    icon={<LayoutDashboard size={15} />}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="label">Project Type</label>
                        <select
                          value={form.project_type}
                          onChange={(e) =>
                            handleChange("project_type", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="rapid-proof">48-Hour Live Proof</option>
                          <option value="starter-proof-launch">
                            Starter Proof + Launch
                          </option>
                          <option value="business-pwa">Business PWA</option>
                          <option value="operations-pwa">Operations PWA</option>
                          <option value="managed-support">
                            Managed Support Only
                          </option>
                          <option value="custom">Custom Scope</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Package Selected</label>
                        <select
                          value={form.package_selected}
                          onChange={(e) =>
                            handleChange("package_selected", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="rapid-proof-sprint">
                            Rapid Proof Sprint
                          </option>
                          <option value="starter-proof-launch">
                            Starter Proof + Launch
                          </option>
                          <option value="business-pwa">Business PWA</option>
                          <option value="operations-pwa">Operations PWA</option>
                          <option value="monthly-managed-support">
                            Monthly Managed Support
                          </option>
                          <option value="custom">Custom Package</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Pipeline Stage</label>
                        <select
                          value={form.pipeline_stage}
                          onChange={(e) =>
                            handleChange("pipeline_stage", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="lead">Lead</option>
                          <option value="qualified">Qualified</option>
                          <option value="proof-sprint">Proof Sprint</option>
                          <option value="proposal-sent">Proposal Sent</option>
                          <option value="converted">Converted</option>
                          <option value="onboarding">Onboarding</option>
                          <option value="build">Build</option>
                          <option value="launch">Launch</option>
                          <option value="monthly-support">
                            Monthly Support
                          </option>
                          <option value="paused">Paused</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Status</label>
                        <select
                          value={form.status}
                          onChange={(e) => handleChange("status", e.target.value)}
                          className="select mt-2"
                        >
                          <option value="new inquiry">New Inquiry</option>
                          <option value="needs qualification">
                            Needs Qualification
                          </option>
                          <option value="proof in progress">
                            Proof In Progress
                          </option>
                          <option value="awaiting approval">
                            Awaiting Approval
                          </option>
                          <option value="deposit pending">Deposit Pending</option>
                          <option value="implementation active">
                            Implementation Active
                          </option>
                          <option value="launch preparation">
                            Launch Preparation
                          </option>
                          <option value="support active">Support Active</option>
                          <option value="paused">Paused</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                  </FormSection>

                  <FormSection
                    eyebrow="Intake and scope"
                    title="What does the client need?"
                    icon={<Sparkles size={15} />}
                  >
                    <TextAreaField
                      label="Intake Summary"
                      value={form.intake_summary}
                      onChange={(v) => handleChange("intake_summary", v)}
                      placeholder="Summarize the client’s business, intake answers, PDF/company profile, and requested direction."
                    />

                    <TextAreaField
                      label="Business Goals"
                      value={form.business_goals}
                      onChange={(v) => handleChange("business_goals", v)}
                      placeholder="What should this PWA help the business accomplish?"
                    />

                    <TextAreaField
                      label="Pain Points / Operational Problems"
                      value={form.pain_points}
                      onChange={(v) => handleChange("pain_points", v)}
                      placeholder="Manual admin, scattered communication, weak follow-up, no portal, no dashboard, document handling problems..."
                    />

                    <TextAreaField
                      label="Requested Pages / Areas"
                      value={form.requested_pages}
                      onChange={(v) => handleChange("requested_pages", v)}
                      placeholder="Home, Solutions, Client Hub, dashboard, service pages, contact, case studies, etc."
                    />

                    <TextAreaField
                      label="Requested Features / Modules"
                      value={form.requested_features}
                      onChange={(v) => handleChange("requested_features", v)}
                      placeholder="Admin dashboard, client portal, messaging, uploads, PDF proposals, recurring support tracking, agent attribution..."
                    />

                    <TextAreaField
                      label="Branding / Design Notes"
                      value={form.branding_notes}
                      onChange={(v) => handleChange("branding_notes", v)}
                      placeholder="Brand colors, tone, logo notes, competitor references, premium/dark/light direction..."
                    />
                  </FormSection>

                  <FormSection
                    eyebrow="Documents and onboarding"
                    title="Files, assets, and next steps"
                    icon={<FileUp size={15} />}
                  >
                    <div>
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                        <FileUp size={16} />
                        Initial Intake / Company Profile / Scope File
                        <span className="font-normal text-[var(--text-muted)]">
                          (optional PDF/image)
                        </span>
                      </label>

                      <input
                        key={fileInputKey}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setInitialFile(e.target.files?.[0] || null)
                        }
                        className="input mt-2"
                        disabled={saving}
                      />

                      <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
                        Upload a company profile, intake PDF, reference image,
                        proposal draft, or scope document. The file URL will be
                        saved with this project.
                      </p>

                      {initialFile ? (
                        <div className="mt-3 flex items-center justify-between gap-3 rounded-[1rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3">
                          <span className="min-w-0 truncate text-sm text-[var(--text-secondary)]">
                            {initialFile.name}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setInitialFile(null);
                              setFileInputKey((prev) => prev + 1);
                            }}
                            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--border)] bg-[rgba(6,10,18,0.58)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition hover:bg-[rgba(77,163,255,0.08)] hover:text-[var(--text-primary)]"
                            disabled={saving}
                          >
                            <X size={14} />
                            Remove
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <Field
                      label="Shared Resource Link"
                      value={form.resource_link}
                      onChange={(v) => handleChange("resource_link", v)}
                      placeholder="Google Drive / Docs / Sheet / Figma / Vercel preview link"
                    />

                    <TextAreaField
                      label="Onboarding Checklist"
                      value={form.onboarding_checklist}
                      onChange={(v) => handleChange("onboarding_checklist", v)}
                      placeholder="Domain, logo, copy, images, Firebase config, access details, package approval, payment proof..."
                    />

                    <TextAreaField
                      label="Required Assets"
                      value={form.required_assets}
                      onChange={(v) => handleChange("required_assets", v)}
                      placeholder="Logo, brand colors, company profile, services list, team bios, PDFs, images, existing domain, social links..."
                    />
                  </FormSection>

                  <FormSection
                    eyebrow="Commercial and support"
                    title="Proof, proposal, payment, and support tracking"
                    icon={<ShieldCheck size={15} />}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="label">Proof Status</label>
                        <select
                          value={form.proof_status}
                          onChange={(e) =>
                            handleChange("proof_status", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="not started">Not Started</option>
                          <option value="intake received">Intake Received</option>
                          <option value="preview building">Preview Building</option>
                          <option value="live preview sent">
                            Live Preview Sent
                          </option>
                          <option value="approved">Approved</option>
                          <option value="declined">Declined</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Proposal Status</label>
                        <select
                          value={form.proposal_status}
                          onChange={(e) =>
                            handleChange("proposal_status", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="not sent">Not Sent</option>
                          <option value="drafting">Drafting</option>
                          <option value="sent">Sent</option>
                          <option value="approved">Approved</option>
                          <option value="needs changes">Needs Changes</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Contract Status</label>
                        <select
                          value={form.contract_status}
                          onChange={(e) =>
                            handleChange("contract_status", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="not sent">Not Sent</option>
                          <option value="sent">Sent</option>
                          <option value="signed">Signed</option>
                          <option value="not required yet">
                            Not Required Yet
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Payment Status</label>
                        <select
                          value={form.payment_status}
                          onChange={(e) =>
                            handleChange("payment_status", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="not paid">Not Paid</option>
                          <option value="proof sprint paid">
                            Proof Sprint Paid
                          </option>
                          <option value="deposit paid">Deposit Paid</option>
                          <option value="partially paid">Partially Paid</option>
                          <option value="paid in full">Paid In Full</option>
                          <option value="monthly active">Monthly Active</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Support Plan</label>
                        <select
                          value={form.support_plan}
                          onChange={(e) =>
                            handleChange("support_plan", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="not selected">Not Selected</option>
                          <option value="light support">Light Support</option>
                          <option value="managed support">Managed Support</option>
                          <option value="operations support">
                            Operations Support
                          </option>
                          <option value="custom">Custom</option>
                        </select>
                      </div>

                      <div>
                        <label className="label">Support Status</label>
                        <select
                          value={form.support_status}
                          onChange={(e) =>
                            handleChange("support_status", e.target.value)
                          }
                          className="select mt-2"
                        >
                          <option value="not active">Not Active</option>
                          <option value="pending">Pending</option>
                          <option value="support active">Support Active</option>
                          <option value="paused">Paused</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>

                      <Field
                        label="Monthly Support Amount"
                        value={form.monthly_support_amount}
                        onChange={(v) =>
                          handleChange("monthly_support_amount", v)
                        }
                        placeholder="Example: USD 500/month"
                      />
                    </div>
                  </FormSection>

                  <FormSection
                    eyebrow="Portal and internal notes"
                    title="Client visibility and internal controls"
                    icon={<LayoutDashboard size={15} />}
                  >
                    <label className="flex items-center gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[rgba(15,23,42,0.72)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">
                      <input
                        type="checkbox"
                        checked={form.portal_access}
                        onChange={(e) =>
                          handleChange("portal_access", e.target.checked)
                        }
                      />
                      Client should have Client Hub access
                    </label>

                    <TextAreaField
                      label="Admin Notes (Internal Only)"
                      value={form.admin_notes}
                      onChange={(v) => handleChange("admin_notes", v)}
                      placeholder="Internal fulfillment notes, sales context, agent details, risks, pricing notes, or private reminders."
                    />

                    <TextAreaField
                      label="Progress Update (Client can see this)"
                      value={form.progress_update}
                      onChange={(v) => handleChange("progress_update", v)}
                      placeholder="Client-facing project update. Keep it clear, calm, and professional."
                    />
                  </FormSection>

                  {message ? (
                    <div
                      className={`rounded-[1rem] px-4 py-3 text-sm ${
                        success
                          ? "border border-green-400/30 bg-green-400/10 text-green-200"
                          : "border border-red-500/30 bg-red-500/10 text-red-200"
                      }`}
                    >
                      {message}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <FolderPlus size={18} />
                      )}
                      {saving ? "Submitting..." : "Create Project Record"}
                    </button>

                    <button
                      type="button"
                      onClick={() => router.back()}
                      className="btn btn-outline"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function FormSection({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.35rem] border border-[var(--border)] bg-[rgba(15,23,42,0.5)] p-4 md:p-5">
      <div className="mb-4">
        <div className="eyebrow mb-0">
          {icon}
          {eyebrow}
        </div>
        <h2 className="mt-2 text-xl">{title}</h2>
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="input mt-2"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="textarea mt-2 min-h-[120px] rounded-[1.25rem]"
      />
    </div>
  );
}