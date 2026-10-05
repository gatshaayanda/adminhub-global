"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendConversation = friendConversation;
exports.sendFriendMessage = sendFriendMessage;
require("server-only");
const node_crypto_1 = require("node:crypto");
const account_1 = require("../account");
const chatAttachments_1 = require("../chatAttachments");
const social_1 = require("../social");
const firebaseAdmin_1 = require("../../../utils/firebaseAdmin");
const persistence_1 = require("./persistence");
const chatAttachments_2 = require("./chatAttachments");
function clean(value) {
    return JSON.parse(JSON.stringify(value));
}
function playerId(value) {
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0)
        throw Object.assign(new Error("A valid BoardSignal player is required."), { status: 400 });
    return parsed;
}
function blockId(blocker, blocked) {
    return `${blocker}_${blocked}`;
}
function stableMessageId(scope, input) {
    const clientId = String(input ?? "").trim();
    if (!clientId)
        return (0, node_crypto_1.randomUUID)();
    if (clientId.length > 160)
        throw Object.assign(new Error("Message request ID is invalid."), { status: 400 });
    return `msg_${(0, node_crypto_1.createHash)("sha256").update(`${scope}:${clientId}`).digest("hex").slice(0, 40)}`;
}
async function accountByPlayerId(targetPlayerId) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const mapping = await db.collection("chessPlayerAccounts").doc(String(targetPlayerId)).get();
    const uid = String(mapping.data()?.uid ?? (0, account_1.firebaseUidForChessPlayer)(targetPlayerId));
    const snapshot = await db.collection("users").doc(uid).get();
    if (!snapshot.exists)
        throw Object.assign(new Error("That BoardSignal player is not available."), { status: 404 });
    const account = snapshot.data();
    if (account.role !== "player" || account.accessStatus !== "active" || account.chessCom.playerId !== targetPlayerId) {
        throw Object.assign(new Error("That BoardSignal player is not available."), { status: 404 });
    }
    return account;
}
function friendshipRefs(left, right) {
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const relationshipId = (0, social_1.canonicalSocialRelationshipId)(left.chessCom.playerId, right.chessCom.playerId);
    return {
        relationshipId,
        relationship: db.collection("socialRelationships").doc(relationshipId),
        leftBlocksRight: db.collection("socialBlocks").doc(blockId(left.chessCom.playerId, right.chessCom.playerId)),
        rightBlocksLeft: db.collection("socialBlocks").doc(blockId(right.chessCom.playerId, left.chessCom.playerId)),
    };
}
function assertAcceptedRelationship(left, right, relationship, leftBlock, rightBlock) {
    const data = relationship.data();
    const ids = new Set([data?.playerAId, data?.playerBId]);
    const uids = new Set([data?.playerAUid, data?.playerBUid]);
    if (!relationship.exists || data?.status !== "friends" || !ids.has(left.chessCom.playerId) || !ids.has(right.chessCom.playerId) || !uids.has(left.uid) || !uids.has(right.uid)) {
        throw Object.assign(new Error("Private messages are available only between accepted BoardSignal friends."), { status: 403 });
    }
    if (leftBlock.exists || rightBlock.exists)
        throw Object.assign(new Error("Private messaging is unavailable for this connection."), { status: 403 });
}
async function assertCurrentFriendship(left, right) {
    const refs = friendshipRefs(left, right);
    const [relationship, leftBlock, rightBlock] = await Promise.all([
        refs.relationship.get(),
        refs.leftBlocksRight.get(),
        refs.rightBlocksLeft.get(),
    ]);
    assertAcceptedRelationship(left, right, relationship, leftBlock, rightBlock);
    return refs.relationshipId;
}
async function friendConversation(token, otherPlayerIdInput) {
    const account = await (0, persistence_1.accountForToken)(token);
    const other = await accountByPlayerId(playerId(otherPlayerIdInput));
    if (other.uid === account.uid)
        throw Object.assign(new Error("Choose another BoardSignal player."), { status: 400 });
    const threadId = await assertCurrentFriendship(account, other);
    const threadRef = (0, firebaseAdmin_1.getAdminDb)().collection("friendConversations").doc(threadId);
    const messages = await threadRef.collection("messages").orderBy("createdAt", "desc").limit(100).get();
    const hydrated = await Promise.all(messages.docs.reverse().map(async (document) => {
        const message = { id: document.id, ...document.data() };
        return { ...message, attachment: await (0, chatAttachments_2.hydrateBoardSignalChatAttachment)(message.attachment) };
    }));
    const orderedIds = [account.chessCom.playerId, other.chessCom.playerId].sort((a, b) => a - b);
    const orderedUids = orderedIds[0] === account.chessCom.playerId ? [account.uid, other.uid] : [other.uid, account.uid];
    return {
        thread: { id: threadId, participantUids: orderedUids, participantPlayerIds: orderedIds },
        friend: { uid: other.uid, playerId: other.chessCom.playerId, canonicalUsername: other.chessCom.canonicalUsername },
        messages: hydrated,
    };
}
async function sendFriendMessage(token, otherPlayerIdInput, bodyInput, attachmentInput, clientMessageIdInput) {
    const account = await (0, persistence_1.accountForToken)(token);
    const other = await accountByPlayerId(playerId(otherPlayerIdInput));
    if (other.uid === account.uid)
        throw Object.assign(new Error("Choose another BoardSignal player."), { status: 400 });
    const body = (0, chatAttachments_1.normalizeChatMessageBody)(bodyInput, 2000);
    const requestedAttachment = attachmentInput === undefined || attachmentInput === null ? undefined : (0, chatAttachments_1.validateBoardSignalChatAttachment)(attachmentInput);
    (0, chatAttachments_1.requireChatMessageContent)(body, requestedAttachment);
    const threadId = await assertCurrentFriendship(account, other);
    const messageId = stableMessageId(`${account.uid}:${threadId}`, clientMessageIdInput);
    const actor = (0, chatAttachments_2.playerChatUploadActor)(account);
    const claim = { kind: "friend_message", id: messageId, threadId, recipientUid: other.uid };
    let attachment;
    if (requestedAttachment)
        attachment = await (0, chatAttachments_2.claimBoardSignalChatAttachment)(requestedAttachment, actor, claim);
    const db = (0, firebaseAdmin_1.getAdminDb)();
    const refs = friendshipRefs(account, other);
    const threadRef = db.collection("friendConversations").doc(threadId);
    const messageRef = threadRef.collection("messages").doc(messageId);
    const createdAt = new Date().toISOString();
    const orderedIds = [account.chessCom.playerId, other.chessCom.playerId].sort((a, b) => a - b);
    const orderedUids = orderedIds[0] === account.chessCom.playerId ? [account.uid, other.uid] : [other.uid, account.uid];
    try {
        let result;
        await db.runTransaction(async (transaction) => {
            // Relationship and block state are deliberately re-read at SEND time.
            const [relationship, leftBlock, rightBlock, existing] = await Promise.all([
                transaction.get(refs.relationship),
                transaction.get(refs.leftBlocksRight),
                transaction.get(refs.rightBlocksLeft),
                transaction.get(messageRef),
            ]);
            assertAcceptedRelationship(account, other, relationship, leftBlock, rightBlock);
            if (existing.exists) {
                result = { id: existing.id, ...existing.data() };
                return;
            }
            const message = {
                id: messageId,
                threadId,
                senderUid: account.uid,
                senderPlayerId: account.chessCom.playerId,
                recipientUid: other.uid,
                recipientPlayerId: other.chessCom.playerId,
                body,
                createdAt,
                ...(attachment ? { attachment } : {}),
            };
            transaction.set(threadRef, clean({
                id: threadId,
                participantUids: orderedUids,
                participantPlayerIds: orderedIds,
                createdAt,
                updatedAt: createdAt,
                lastMessageId: messageId,
            }), { merge: true });
            transaction.set(messageRef, clean(message), { merge: false });
            result = message;
        });
        const message = result;
        return { ...message, attachment: await (0, chatAttachments_2.hydrateBoardSignalChatAttachment)(message.attachment) };
    }
    catch (reason) {
        if (attachment)
            await (0, chatAttachments_2.cleanupClaimedAttachmentAfterFailedMessage)(actor, attachment, claim).catch(() => false);
        throw reason;
    }
}
