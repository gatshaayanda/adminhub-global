export const FEATURE_PIPELINE_STATUSES = ["planned", "building", "released", "exploring"] as const;
export type FeaturePipelineStatus = typeof FEATURE_PIPELINE_STATUSES[number];
export type FeaturePipelineModerationStatus = "pending" | "approved" | "hidden";

export type FeaturePipelineItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  detail?: string;
  status: FeaturePipelineStatus;
  category: string;
  publicQuestion?: string;
  order: number;
  visible: boolean;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string;
  releasedAt?: string;
  releaseNote?: string;
  interestCount: number;
  feedbackCount: number;
};

export type PublicFeaturePipelineComment = {
  id: string;
  displayName: string;
  body: string;
  itemId: string;
  createdAt: string;
};

export type PublicFeaturePipelineState = {
  schemaVersion: 1;
  initializedAt?: string;
  updatedAt: string;
  items: FeaturePipelineItem[];
  counts: Record<FeaturePipelineStatus, number> & { communityInput: number };
};

const SEED_DATE = "";

function seedItem(item: Omit<FeaturePipelineItem, "createdAt" | "updatedAt" | "statusUpdatedAt" | "interestCount" | "feedbackCount">): FeaturePipelineItem {
  return { ...item, createdAt: SEED_DATE, updatedAt: SEED_DATE, statusUpdatedAt: SEED_DATE, interestCount: 0, feedbackCount: 0 };
}

export const FEATURE_PIPELINE_SEED_ITEMS: FeaturePipelineItem[] = [
  seedItem({
    id: "BS-P1-LIVE-RECOVERY",
    slug: "live-check-recovery",
    title: "Live checks, with a clearer way back",
    summary: "If live BoardSignal checks pause after a busy day, your saved Reviews and Progress should still be there. We're adding a clearer return time and an optional reminder when live checks reopen.",
    status: "planned",
    category: "Reliability",
    publicQuestion: "Would you want one reminder when live checks reopen?",
    order: 10,
    visible: true,
  }),
  seedItem({
    id: "BS-P2-UNIVERSE-SCALE",
    slug: "growing-universe",
    title: "A BoardSignal Universe built for a bigger field",
    summary: "As more players join BoardSignal, the Universe should keep moving with them. We're preparing its standings and player movement for a much larger field without changing what makes each player's BoardSignal theirs.",
    status: "planned",
    category: "Universe",
    publicQuestion: "What would make the BoardSignal Universe worth checking every week?",
    order: 20,
    visible: true,
  }),
  seedItem({
    id: "BS-P3-LICHESS",
    slug: "lichess",
    title: "Lichess joins the same BoardSignal",
    summary: "Play on Chess.com, Lichess, or both while keeping one BoardSignal, one Review history and one Progress story.",
    status: "planned",
    category: "Game sources",
    publicQuestion: "Do you play mainly on Chess.com, Lichess, or both?",
    order: 30,
    visible: true,
  }),
  seedItem({
    id: "BS-R-HISTORY-RECOVERY",
    slug: "historical-progress-recovery",
    title: "Older weeks can become real Progress",
    summary: "BoardSignal now checks recent completed periods for new and existing players. Weeks with games can become historical Reviews, while weeks without games stay truthfully recorded as no activity.",
    status: "released",
    category: "Reviews",
    order: 110,
    visible: true,
    releaseNote: "Historical onboarding now works even when a player begins with no completed Review history.",
  }),
  seedItem({
    id: "BS-R-CURRENT-RELIABILITY",
    slug: "current-reliability",
    title: "Current BoardSignal remembers its last good check",
    summary: "A temporary refresh problem no longer needs to erase a valid current picture. When BoardSignal has a successful same-period result, it can keep that result visible while a later live check retries.",
    status: "released",
    category: "Reliability",
    order: 120,
    visible: true,
  }),
  seedItem({
    id: "BS-R-COACHING-PRESENTATIONS",
    slug: "coaching-presentations",
    title: "One coaching signal. More than one way to explain it.",
    summary: "BoardSignal can keep the same supported coaching signal while presenting it in another way, and players can react to the explanation that helped — or did not.",
    status: "released",
    category: "Coaching",
    order: 130,
    visible: true,
  }),
];

export function featurePipelineCounts(items: FeaturePipelineItem[]) {
  const visible = items.filter((item) => item.visible);
  return {
    planned: visible.filter((item) => item.status === "planned").length,
    building: visible.filter((item) => item.status === "building").length,
    released: visible.filter((item) => item.status === "released").length,
    exploring: visible.filter((item) => item.status === "exploring").length,
    communityInput: visible.reduce((sum, item) => sum + Math.max(0, Number(item.interestCount || 0)), 0),
  };
}

export function seedFeaturePipelineState(): PublicFeaturePipelineState {
  const items = FEATURE_PIPELINE_SEED_ITEMS.map((item) => ({ ...item }));
  return { schemaVersion: 1, updatedAt: SEED_DATE, items, counts: featurePipelineCounts(items) };
}

export function publicPipelineItems(state: PublicFeaturePipelineState) {
  return state.items.filter((item) => item.visible).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

export function isFeaturePipelineStatus(value: unknown): value is FeaturePipelineStatus {
  return FEATURE_PIPELINE_STATUSES.includes(value as FeaturePipelineStatus);
}

export function cleanPipelineText(value: unknown, max: number, required = false) {
  const text = typeof value === "string" ? value.trim().replace(/\r\n?/g, "\n") : "";
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) throw new Error("Control characters are not allowed.");
  if (required && !text) throw new Error("This field is required.");
  if (text.length > max) throw new Error(`Keep this field to ${max} characters or fewer.`);
  return text;
}

export function cleanPipelineSlug(value: unknown) {
  const slug = cleanPipelineText(value, 80, true).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Use a lowercase URL slug with letters, numbers and hyphens.");
  return slug;
}
