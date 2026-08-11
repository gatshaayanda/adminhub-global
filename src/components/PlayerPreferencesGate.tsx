"use client";

import { useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import type {
  BoardSignalAccount,
  BoardSignalNotificationPreferences,
  BoardSignalPrivacySettings,
} from "@/lib/boardsignal/account";

export default function PlayerPreferencesGate({
  account,
  onContinue,
}: {
  account: BoardSignalAccount;
  onContinue: (privacy: BoardSignalPrivacySettings, notifications: BoardSignalNotificationPreferences) => Promise<void>;
}) {
  const [privacy, setPrivacy] = useState(account.privacy);
  const [notifications, setNotifications] = useState(account.notificationPreferences);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    try {
      await onContinue(privacy, notifications);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your preferences could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="main" className="container beta-agreement-page">
      <section className="beta-agreement-card preference-gate-card">
        <div className="agreement-mark"><ShieldCheck /></div>
        <p className="kicker">YOUR PLAYER ROOM</p>
        <h1>Choose your privacy.</h1>
        <p className="agreement-deck">Your full Desk is private. These choices control whether BoardSignal may also show safe positive coverage.</p>
        <div className="preference-grid">
          <div><h3>Public coverage</h3><label><input type="checkbox" checked={privacy.publicPlayerPage} onChange={(event) => setPrivacy((value) => ({ ...value, publicPlayerPage: event.target.checked }))} /> Enable my public positive player page</label><label><input type="checkbox" checked={privacy.universeCoverage} onChange={(event) => setPrivacy((value) => ({ ...value, universeCoverage: event.target.checked }))} /> Allow safe positive Universe coverage</label><p>Red, Amber, Blue, evidence, recurrence and progress remain private.</p></div>
          <div><h3>Future Desk updates</h3><label><input type="checkbox" checked={notifications.deskReady} onChange={(event) => setNotifications((value) => ({ ...value, deskReady: event.target.checked }))} /> Desk ready</label><label><input type="checkbox" checked={notifications.episodeProgress} onChange={(event) => setNotifications((value) => ({ ...value, episodeProgress: event.target.checked }))} /> Episode progress</label><label><input type="checkbox" checked={notifications.blueReminder} onChange={(event) => setNotifications((value) => ({ ...value, blueReminder: event.target.checked }))} /> Blue reminder</label><p>No email or browser push is sent in this version. These choices prepare that later layer.</p></div>
        </div>
        <button className="button button-lime" type="button" disabled={busy} onClick={save}>{busy ? <><LoaderCircle className="button-spinner" size={16} /> Saving</> : <>Continue to My Player Room <ArrowRight size={16} /></>}</button>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </section>
    </div>
  );
}
