"use client";

import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { firebaseApp } from "@/utils/firebaseConfig";

const GOOGLE_ACCESS_APP_NAME = "boardsignal-google-access";

type FirebaseAuthError = {
  code?: string;
  message?: string;
};

function googleAccessAuth() {
  const app = getApps().find((candidate) => candidate.name === GOOGLE_ACCESS_APP_NAME)
    ?? initializeApp(firebaseApp.options, GOOGLE_ACCESS_APP_NAME);
  return getAuth(app);
}

export function googleAccessErrorMessage(reason: unknown) {
  const error = reason as FirebaseAuthError;
  const code = String(error?.code ?? "");
  if (code === "auth/popup-blocked") return "Google sign-in was blocked by this browser. Allow popups for BoardSignal and try again. Your existing BoardSignal access is unchanged.";
  if (code === "auth/popup-closed-by-user") return "Google sign-in was cancelled. Your existing BoardSignal access is unchanged.";
  if (code === "auth/cancelled-popup-request") return "That Google sign-in attempt was cancelled before it finished. Try again when you're ready; your BoardSignal access is unchanged.";
  if (code === "auth/unauthorized-domain") return "Google sign-in is temporarily unavailable on this address. Open BoardSignal from its main site and try again.";
  if (code === "auth/operation-not-allowed") return "Google sign-in is temporarily unavailable. Try again later or use account recovery if you already have BoardSignal.";
  if (code === "auth/network-request-failed") return "Google sign-in could not connect. Check your connection and try again; your existing BoardSignal access is unchanged.";
  return "Google sign-in could not be completed. Your existing BoardSignal access is unchanged.";
}

export async function requestGoogleAccessCredential() {
  const googleAuth = googleAccessAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await setPersistence(googleAuth, inMemoryPersistence);
    const credential = await signInWithPopup(googleAuth, provider);
    const googleIdToken = await credential.user.getIdToken(true);
    return {
      googleIdToken,
      email: credential.user.email ?? undefined,
    };
  } catch (reason) {
    throw new Error(googleAccessErrorMessage(reason));
  } finally {
    await signOut(googleAuth).catch(() => undefined);
  }
}

export function rememberGoogleEmailPrefill(email?: string) {
  if (!email || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem("boardsignal:google-email-prefill", email);
  } catch { /* optional convenience only */ }
}

export function readGoogleEmailPrefill() {
  if (typeof window === "undefined") return undefined;
  try {
    const email = window.sessionStorage.getItem("boardsignal:google-email-prefill")?.trim();
    return email || undefined;
  } catch {
    return undefined;
  }
}
