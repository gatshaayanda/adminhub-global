"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOARDSIGNAL_CHAT_ATTACHMENT_MAX_COUNT = exports.BOARDSIGNAL_CHAT_PDF_MAX_BYTES = exports.BOARDSIGNAL_CHAT_IMAGE_MAX_BYTES = void 0;
exports.attachmentKindForMimeType = attachmentKindForMimeType;
exports.validateBoardSignalChatAttachment = validateBoardSignalChatAttachment;
exports.normalizeChatMessageBody = normalizeChatMessageBody;
exports.requireChatMessageContent = requireChatMessageContent;
exports.attachmentOnlyNotificationCopy = attachmentOnlyNotificationCopy;
exports.formatBoardSignalAttachmentSize = formatBoardSignalAttachmentSize;
exports.BOARDSIGNAL_CHAT_IMAGE_MAX_BYTES = 4 * 1024 * 1024;
exports.BOARDSIGNAL_CHAT_PDF_MAX_BYTES = 2 * 1024 * 1024 * 1024;
exports.BOARDSIGNAL_CHAT_ATTACHMENT_MAX_COUNT = 1;
const ALLOWED_ATTACHMENT_KEYS = new Set(["kind", "fileKey", "name", "mimeType", "size"]);
function badAttachment(message) {
    return Object.assign(new Error(message), { status: 400 });
}
function attachmentKindForMimeType(mimeTypeInput) {
    const mimeType = String(mimeTypeInput ?? "").trim().toLowerCase();
    if (mimeType === "application/pdf")
        return "pdf";
    if (mimeType.startsWith("image/") && mimeType !== "image/svg+xml")
        return "image";
    return undefined;
}
function validateBoardSignalChatAttachment(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        throw badAttachment("A valid BoardSignal image or PDF attachment is required.");
    }
    const value = input;
    if (Object.keys(value).some((key) => !ALLOWED_ATTACHMENT_KEYS.has(key))) {
        throw badAttachment("Attachment data contains an unsupported field. Upload the file through BoardSignal again.");
    }
    const fileKey = String(value.fileKey ?? "").trim();
    const name = String(value.name ?? "").trim();
    const mimeType = String(value.mimeType ?? "").trim().toLowerCase();
    const kind = attachmentKindForMimeType(mimeType);
    const requestedKind = String(value.kind ?? "").trim();
    const size = Number(value.size);
    if (!fileKey || fileKey.length > 700 || fileKey.includes("\u0000"))
        throw badAttachment("Attachment file key is invalid.");
    if (!name || name.length > 255 || name.includes("\u0000"))
        throw badAttachment("Attachment filename is invalid.");
    if (!kind || requestedKind !== kind)
        throw badAttachment("Only BoardSignal image and PDF attachments are supported.");
    if (!Number.isSafeInteger(size) || size <= 0)
        throw badAttachment("Attachment file size is invalid.");
    if (kind === "image" && size > exports.BOARDSIGNAL_CHAT_IMAGE_MAX_BYTES)
        throw badAttachment("Images may be up to 4MB.");
    if (kind === "pdf" && size > exports.BOARDSIGNAL_CHAT_PDF_MAX_BYTES)
        throw badAttachment("PDFs may be up to 2GB.");
    return { kind, fileKey, name, mimeType, size };
}
function normalizeChatMessageBody(value, max = 4000) {
    const body = String(value ?? "").trim();
    if (body.length > max)
        throw Object.assign(new Error(`Message must be under ${max} characters.`), { status: 400 });
    return body;
}
function requireChatMessageContent(body, attachment) {
    if (!body && !attachment) {
        throw Object.assign(new Error("Write a message or attach one image or PDF."), { status: 400 });
    }
}
function attachmentOnlyNotificationCopy(attachment) {
    if (!attachment)
        return "You have a new private message.";
    return attachment.kind === "image" ? "Sent an image" : "Sent a PDF";
}
function formatBoardSignalAttachmentSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0)
        return "";
    if (bytes >= 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 * 1024 ? 0 : 1)} GB`;
    if (bytes >= 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
    if (bytes >= 1024)
        return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes)} B`;
}
