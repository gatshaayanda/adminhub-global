"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.founderChatUploadActor = founderChatUploadActor;
exports.playerChatUploadActor = playerChatUploadActor;
exports.resolveBoardSignalChatUploadActor = resolveBoardSignalChatUploadActor;
exports.createChatUploadSessionId = createChatUploadSessionId;
exports.recordBoardSignalChatAttachmentUpload = recordBoardSignalChatAttachmentUpload;
exports.validateChatAttachmentOwnership = validateChatAttachmentOwnership;
exports.claimBoardSignalChatAttachment = claimBoardSignalChatAttachment;
exports.hydrateBoardSignalChatAttachment = hydrateBoardSignalChatAttachment;
exports.discardUnclaimedChatAttachment = discardUnclaimedChatAttachment;
exports.cleanupClaimedAttachmentAfterFailedMessage = cleanupClaimedAttachmentAfterFailedMessage;
require("server-only");
const node_crypto_1 = require("node:crypto");
const server_1 = require("uploadthing/server");
const chatAttachments_1 = require("../chatAttachments");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
const founderAuth_1 = require("./founderAuth");
const persistence_1 = require("./persistence");
function receiptId(fileKey) {
    return (0, node_crypto_1.createHash)("sha256").update(fileKey).digest("hex");
}
function receiptRef(fileKey) {
    return (0, firebaseAdmin_1.getAdminDb)().collection("chatAttachmentReceipts").doc(receiptId(fileKey));
}
function actorForPlayer(account) {
    return {
        actorType: "player",
        identityKey: `player:${account.uid}`,
        uid: account.uid,
        playerId: account.chessCom.playerId,
    };
}
function founderChatUploadActor() {
    return { actorType: "founder", identityKey: "founder" };
}
function playerChatUploadActor(account) {
    return actorForPlayer(account);
}
async function resolveBoardSignalChatUploadActor(request) {
    const authorization = request.headers.get("authorization") ?? "";
    if (/^Bearer\s+/i.test(authorization)) {
        const token = await (0, persistence_1.requirePlayerToken)(request);
        const account = await (0, persistence_1.accountForToken)(token);
        if (account.accessStatus !== "active")
            throw Object.assign(new Error("BoardSignal account access is not active."), { status: 403 });
        return actorForPlayer(account);
    }
    if (/^Basic\s+/i.test(authorization)) {
        (0, founderAuth_1.requireFounderBasicAuth)(request);
        return founderChatUploadActor();
    }
    throw Object.assign(new Error("BoardSignal chat uploads require an authenticated player or Founder."), { status: 401 });
}
function createChatUploadSessionId() {
    return (0, node_crypto_1.randomUUID)();
}
async function recordBoardSignalChatAttachmentUpload(actor, uploadSessionId, file) {
    const mimeType = String(file.type ?? "").trim().toLowerCase();
    const kind = (0, chatAttachments_1.attachmentKindForMimeType)(mimeType);
    if (!kind)
        throw Object.assign(new Error("Only non-SVG images and PDFs can be attached to BoardSignal messages."), { status: 400 });
    const attachment = (0, chatAttachments_1.validateBoardSignalChatAttachment)({
        kind,
        fileKey: file.key,
        name: file.name,
        mimeType,
        size: file.size,
    });
    const now = new Date().toISOString();
    const storageViewUrl = String(file.ufsUrl ?? file.url ?? "").trim() || undefined;
    const receipt = {
        ...attachment,
        uploaderActorType: actor.actorType,
        uploaderIdentityKey: actor.identityKey,
        ...(actor.actorType === "player" ? { uploaderUid: actor.uid, uploaderPlayerId: actor.playerId } : {}),
        uploadSessionId,
        ...(storageViewUrl ? { storageViewUrl } : {}),
        createdAt: now,
        status: "uploaded",
    };
    try {
        await receiptRef(attachment.fileKey).set(receipt, { merge: false });
    }
    catch (reason) {
        // UploadThing has already accepted the bytes at this point. If the ownership receipt
        // cannot be made durable, best-effort remove the file so it cannot become a permanent
        // unclaimable orphan. Receipt persistence remains the authority for message claims.
        await deleteStoredFile(attachment.fileKey).catch(() => undefined);
        throw reason;
    }
    return { attachment, viewUrl: storageViewUrl };
}
function assertReceiptMatches(receipt, attachment, actor, allowedClaim) {
    if (!receipt || receipt.fileKey !== attachment.fileKey)
        throw Object.assign(new Error("That attachment was not uploaded through BoardSignal chat."), { status: 400 });
    if (receipt.uploaderIdentityKey !== actor.identityKey || receipt.uploaderActorType !== actor.actorType) {
        throw Object.assign(new Error("That attachment belongs to a different BoardSignal sender."), { status: 403 });
    }
    if (receipt.kind !== attachment.kind
        || receipt.name !== attachment.name
        || receipt.mimeType !== attachment.mimeType
        || receipt.size !== attachment.size) {
        throw Object.assign(new Error("Attachment metadata does not match the completed BoardSignal upload."), { status: 400 });
    }
    if (receipt.status === "deleted" || receipt.status === "cleanup_failed") {
        throw Object.assign(new Error("That uploaded attachment is no longer available to send."), { status: 409 });
    }
    if (receipt.status === "claimed") {
        const sameClaim = Boolean(allowedClaim && receipt.claimId === allowedClaim.id && receipt.claimKind === allowedClaim.kind);
        if (!sameClaim)
            throw Object.assign(new Error("That attachment has already been used in another message."), { status: 409 });
    }
}
async function validateChatAttachmentOwnership(input, actor, allowedClaim) {
    const attachment = (0, chatAttachments_1.validateBoardSignalChatAttachment)(input);
    const snapshot = await receiptRef(attachment.fileKey).get();
    assertReceiptMatches(snapshot.data(), attachment, actor, allowedClaim);
    return attachment;
}
async function claimBoardSignalChatAttachment(input, actor, claim) {
    const attachment = (0, chatAttachments_1.validateBoardSignalChatAttachment)(input);
    const ref = receiptRef(attachment.fileKey);
    await (0, firebaseAdmin_1.getAdminDb)().runTransaction(async (transaction) => {
        const snapshot = await transaction.get(ref);
        const receipt = snapshot.data();
        assertReceiptMatches(receipt, attachment, actor, claim);
        if (receipt?.status === "claimed")
            return;
        transaction.set(ref, {
            status: "claimed",
            claimedAt: new Date().toISOString(),
            claimKind: claim.kind,
            claimId: claim.id,
            ...(claim.threadId ? { claimThreadId: claim.threadId } : {}),
            ...(claim.recipientUid ? { claimRecipientUid: claim.recipientUid } : {}),
        }, { merge: true });
    });
    return attachment;
}
async function hydrateBoardSignalChatAttachment(attachmentInput) {
    if (!attachmentInput)
        return undefined;
    const attachment = (0, chatAttachments_1.validateBoardSignalChatAttachment)(attachmentInput);
    const snapshot = await receiptRef(attachment.fileKey).get();
    const receipt = snapshot.data();
    if (!receipt || receipt.status === "deleted" || receipt.fileKey !== attachment.fileKey)
        return attachment;
    return receipt.storageViewUrl ? { ...attachment, viewUrl: receipt.storageViewUrl } : attachment;
}
async function deleteStoredFile(fileKey) {
    const utapi = new server_1.UTApi();
    await utapi.deleteFiles(fileKey);
}
async function bestEffortDeleteReceiptFile(ref, receipt) {
    const attemptedAt = new Date().toISOString();
    try {
        await deleteStoredFile(receipt.fileKey);
        await ref.set({ status: "deleted", cleanupAttemptedAt: attemptedAt, cleanupError: "" }, { merge: true });
        return true;
    }
    catch (reason) {
        await ref.set({
            status: "cleanup_failed",
            cleanupAttemptedAt: attemptedAt,
            cleanupError: reason instanceof Error ? reason.message.slice(0, 500) : "UploadThing cleanup failed.",
        }, { merge: true }).catch(() => undefined);
        return false;
    }
}
async function discardUnclaimedChatAttachment(actor, fileKeyInput) {
    const fileKey = String(fileKeyInput ?? "").trim();
    if (!fileKey)
        throw Object.assign(new Error("Attachment file key is required."), { status: 400 });
    const ref = receiptRef(fileKey);
    const snapshot = await ref.get();
    const receipt = snapshot.data();
    if (!receipt)
        return { discarded: true, alreadyGone: true };
    if (receipt.uploaderIdentityKey !== actor.identityKey)
        throw Object.assign(new Error("That attachment belongs to a different sender."), { status: 403 });
    if (receipt.status === "claimed")
        throw Object.assign(new Error("A sent attachment cannot be removed from its message."), { status: 409 });
    if (receipt.status === "deleted")
        return { discarded: true, alreadyGone: true };
    return { discarded: await bestEffortDeleteReceiptFile(ref, receipt) };
}
async function cleanupClaimedAttachmentAfterFailedMessage(actor, attachment, claim) {
    if (!attachment)
        return false;
    const ref = receiptRef(attachment.fileKey);
    const snapshot = await ref.get();
    const receipt = snapshot.data();
    if (!receipt || receipt.uploaderIdentityKey !== actor.identityKey)
        return false;
    if (receipt.status !== "claimed" || receipt.claimId !== claim.id || receipt.claimKind !== claim.kind)
        return false;
    return bestEffortDeleteReceiptFile(ref, receipt);
}
