"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isFirebaseAdminConfigured = isFirebaseAdminConfigured;
exports.getAdminApp = getAdminApp;
exports.getAdminDb = getAdminDb;
exports.getAdminAuth = getAdminAuth;
exports.getAdminMessaging = getAdminMessaging;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
function serviceAccount() {
    const raw = process.env.FIREBASE_ADMIN_KEY;
    if (!raw)
        throw new Error("Firebase Admin is not configured.");
    try {
        return JSON.parse(raw);
    }
    catch {
        throw new Error("FIREBASE_ADMIN_KEY is not valid JSON.");
    }
}
function isFirebaseAdminConfigured() {
    return Boolean(process.env.FIREBASE_ADMIN_KEY?.trim());
}
function getAdminApp() {
    if ((0, app_1.getApps)().length)
        return (0, app_1.getApp)();
    return (0, app_1.initializeApp)({ credential: (0, app_1.cert)(serviceAccount()) });
}
function getAdminDb() {
    return (0, firestore_1.getFirestore)(getAdminApp());
}
function getAdminAuth() {
    return (0, auth_1.getAuth)(getAdminApp());
}
function getAdminMessaging() {
    return (0, messaging_1.getMessaging)(getAdminApp());
}
