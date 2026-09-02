"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, LoaderCircle } from "lucide-react";
import { getBoardSignalBrowserPushToken } from "@/components/BrowserPushControl";
import { auth } from "@/utils/firebaseConfig";

type ReminderState = "idle" | "setting" | "set" | "error";
type ApiResponse = { ok?: boolean; reminderSet?: boolean; error?: string; code?: string };

export default function LiveRecoveryReminder() {
  const configured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [state, setState] = useState<ReminderState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission);
  }, []);

  async function setReminder() {
    if (state === "setting" || state === "set" || permission === "denied" || permission === "unsupported") return;
    setState("setting");
    setError("");
    try {
      let nextPermission = permission;
      if (nextPermission === "default") {
        // The browser prompt is reachable only from this explicit player gesture.
        nextPermission = await Notification.requestPermission();
        setPermission(nextPermission);
      }
      if (nextPermission !== "granted") {
        setState("idle");
        return;
      }
      const user = auth.currentUser;
      if (!user) throw new Error("Sign in again before setting a recovery reminder.");
      const [idToken, fcmToken] = await Promise.all([user.getIdToken(), getBoardSignalBrowserPushToken()]);
      const response = await fetch("/api/boardsignal/live-recovery", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "subscribe", fcmToken }),
      });
      const body = await response.json() as ApiResponse;
      if (!response.ok || !body.ok || !body.reminderSet) throw new Error(body.error ?? "BoardSignal recovery reminders are unavailable right now.");
      setState("set");
    } catch (reason) {
      setState("error");
      setError(reason instanceof Error ? reason.message : "BoardSignal recovery reminders are unavailable right now.");
    }
  }

  if (!configured || permission === "unsupported") {
    return <div className="browser-push-state live-recovery-reminder-unavailable"><BellOff size={17} /><div><strong>Recovery reminder unavailable here</strong><p>The reset time above still applies. This browser cannot receive the one-time BoardSignal recovery alert right now.</p></div></div>;
  }
  if (permission === "denied") {
    return <div className="browser-push-state live-recovery-reminder-denied"><BellOff size={17} /><div><strong>Browser notifications are blocked</strong><p>BoardSignal respects that choice and will not ask again. The reset time above still applies.</p></div></div>;
  }
  if (state === "set") {
    return <div className="browser-push-state live-recovery-reminder-set" role="status"><Bell size={17} /><div><strong>REMINDER SET</strong><p>We'll let you know when live checks reopen.</p></div></div>;
  }

  return <div className="browser-push-state live-recovery-reminder"><Bell size={17} /><div><strong>Want one recovery alert?</strong><p>This is only for today's live-capacity reset. It does not enable BoardSignal's normal browser alerts.</p>{error ? <p className="form-error" role="alert">{error}</p> : null}<button type="button" className="button button-outline" disabled={state === "setting"} onClick={() => void setReminder()}>{state === "setting" ? <><LoaderCircle className="button-spinner" size={14} /> Setting reminder</> : "NOTIFY ME WHEN BOARDSIGNAL IS BACK"}</button></div></div>;
}
