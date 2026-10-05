"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePlayerRoomOfflineSnapshot = savePlayerRoomOfflineSnapshot;
exports.loadPlayerRoomOfflineSnapshot = loadPlayerRoomOfflineSnapshot;
exports.saveSocialOverviewOfflineSnapshot = saveSocialOverviewOfflineSnapshot;
exports.saveSocialComparisonOfflineSnapshot = saveSocialComparisonOfflineSnapshot;
exports.loadSocialOfflineSnapshot = loadSocialOfflineSnapshot;
exports.getOfflineMeta = getOfflineMeta;
exports.saveOfflineMeta = saveOfflineMeta;
exports.saveOfflineDraft = saveOfflineDraft;
exports.loadOfflineDrafts = loadOfflineDrafts;
exports.deleteOfflineDraft = deleteOfflineDraft;
exports.requestPersistentStorageBestEffort = requestPersistentStorageBestEffort;
const db_1 = require("./db");
const types_1 = require("./types");
const PLAYER_ROOM_KIND = "player-room";
const SOCIAL_KIND = "social";
async function savePlayerRoomOfflineSnapshot(uid, input) {
    if (input.account.uid !== uid)
        throw new Error("Offline snapshot identity mismatch.");
    const now = new Date().toISOString();
    const desks = [...input.desks]
        .sort((a, b) => b.summary.periodEnd.localeCompare(a.summary.periodEnd))
        .slice(0, types_1.BOARDSIGNAL_OFFLINE_MAX_DESKS);
    const activeDeskKeys = new Set(desks.map((item) => item.summary.deskKey));
    const snapshot = {
        version: 1,
        uid,
        canonicalUsername: input.account.chessCom.canonicalUsername,
        avatar: input.account.chessCom.avatar,
        savedAt: now,
        lastSyncedAt: now,
        desks,
        progress: input.progress.map((series) => ({ ...series, points: series.points.filter((point) => activeDeskKeys.has(point.deskKey)).slice(-types_1.BOARDSIGNAL_OFFLINE_MAX_DESKS) })),
        recurringPatterns: input.recurringPatterns,
        personalRecords: input.personalRecords,
        currentEpisode: input.currentEpisode,
        pulse: input.pulse,
        shareMoments: (input.shareMoments ?? []).filter((item) => activeDeskKeys.has(item.deskKey)).slice(0, 12),
    };
    await (0, db_1.putOfflineRecord)("snapshots", { key: (0, db_1.offlineKey)(uid, PLAYER_ROOM_KIND), uid, kind: PLAYER_ROOM_KIND, updatedAt: now, payload: snapshot });
    const meta = await getOfflineMeta(uid);
    const firstReady = desks.length > 0 && !meta.offlineReadyAcknowledgedAt;
    await saveOfflineMeta(uid, {
        ...meta,
        uid,
        lastSyncedAt: now,
        ...(firstReady ? { offlineReadyAcknowledgedAt: now } : {}),
    });
    return { snapshot, firstReady };
}
async function loadPlayerRoomOfflineSnapshot(uid) {
    return (await (0, db_1.getOfflineRecord)("snapshots", (0, db_1.offlineKey)(uid, PLAYER_ROOM_KIND), uid))?.payload;
}
async function saveSocialOverviewOfflineSnapshot(uid, overview) {
    const previous = await loadSocialOfflineSnapshot(uid);
    const now = new Date().toISOString();
    const snapshot = { version: 1, uid, savedAt: now, overview, comparisons: previous?.comparisons?.slice(0, types_1.BOARDSIGNAL_OFFLINE_MAX_SOCIAL_COMPARISONS) ?? [] };
    await (0, db_1.putOfflineRecord)("snapshots", { key: (0, db_1.offlineKey)(uid, SOCIAL_KIND), uid, kind: SOCIAL_KIND, updatedAt: now, payload: snapshot });
    return snapshot;
}
async function saveSocialComparisonOfflineSnapshot(uid, comparison) {
    const previous = await loadSocialOfflineSnapshot(uid);
    const now = new Date().toISOString();
    const others = (previous?.comparisons ?? []).filter((item) => item.right.playerId !== comparison.right.playerId);
    const snapshot = { version: 1, uid, savedAt: now, overview: previous?.overview, comparisons: [comparison, ...others].slice(0, types_1.BOARDSIGNAL_OFFLINE_MAX_SOCIAL_COMPARISONS) };
    await (0, db_1.putOfflineRecord)("snapshots", { key: (0, db_1.offlineKey)(uid, SOCIAL_KIND), uid, kind: SOCIAL_KIND, updatedAt: now, payload: snapshot });
    return snapshot;
}
async function loadSocialOfflineSnapshot(uid) {
    return (await (0, db_1.getOfflineRecord)("snapshots", (0, db_1.offlineKey)(uid, SOCIAL_KIND), uid))?.payload;
}
async function getOfflineMeta(uid) {
    return (await (0, db_1.getOfflineRecord)("meta", (0, db_1.offlineKey)(uid, "meta"), uid))?.payload ?? { uid };
}
async function saveOfflineMeta(uid, meta) {
    const now = new Date().toISOString();
    await (0, db_1.putOfflineRecord)("meta", { key: (0, db_1.offlineKey)(uid, "meta"), uid, kind: "meta", updatedAt: now, payload: { ...meta, uid } });
}
async function saveOfflineDraft(draft) {
    const now = new Date().toISOString();
    await (0, db_1.putOfflineRecord)("drafts", { key: (0, db_1.offlineKey)(draft.uid, "draft", draft.id), uid: draft.uid, kind: "draft", updatedAt: now, payload: { ...draft, body: draft.body.slice(0, 4000), updatedAt: now } });
    // Bound draft count by pruning oldest records for this UID using known slots maintained by a compact index.
    const metaKey = (0, db_1.offlineKey)(draft.uid, "draft-index");
    const current = (await (0, db_1.getOfflineRecord)("meta", metaKey, draft.uid))?.payload ?? [];
    const next = [draft.id, ...current.filter((id) => id !== draft.id)].slice(0, types_1.BOARDSIGNAL_OFFLINE_MAX_DRAFTS);
    await (0, db_1.putOfflineRecord)("meta", { key: metaKey, uid: draft.uid, kind: "draft-index", updatedAt: now, payload: next });
    for (const id of current.filter((id) => !next.includes(id))) {
        const { deleteOfflineRecord } = await Promise.resolve().then(() => __importStar(require("./db")));
        await deleteOfflineRecord("drafts", (0, db_1.offlineKey)(draft.uid, "draft", id));
    }
    return next;
}
async function loadOfflineDrafts(uid) {
    const index = (await (0, db_1.getOfflineRecord)("meta", (0, db_1.offlineKey)(uid, "draft-index"), uid))?.payload ?? [];
    const drafts = await Promise.all(index.map(async (id) => (await (0, db_1.getOfflineRecord)("drafts", (0, db_1.offlineKey)(uid, "draft", id), uid))?.payload));
    return drafts.filter((item) => Boolean(item));
}
async function deleteOfflineDraft(uid, id) {
    const { deleteOfflineRecord } = await Promise.resolve().then(() => __importStar(require("./db")));
    await deleteOfflineRecord("drafts", (0, db_1.offlineKey)(uid, "draft", id));
    const metaKey = (0, db_1.offlineKey)(uid, "draft-index");
    const current = (await (0, db_1.getOfflineRecord)("meta", metaKey, uid))?.payload ?? [];
    const next = current.filter((item) => item !== id).slice(0, types_1.BOARDSIGNAL_OFFLINE_MAX_DRAFTS);
    await (0, db_1.putOfflineRecord)("meta", { key: metaKey, uid, kind: "draft-index", updatedAt: new Date().toISOString(), payload: next });
}
async function requestPersistentStorageBestEffort(uid) {
    if (typeof navigator === "undefined" || !navigator.storage?.persist)
        return false;
    const meta = await getOfflineMeta(uid);
    if (meta.storagePersistRequestedAt)
        return Boolean(await navigator.storage.persisted?.());
    const granted = await navigator.storage.persist().catch(() => false);
    await saveOfflineMeta(uid, { ...meta, uid, storagePersistRequestedAt: new Date().toISOString() });
    return granted;
}
