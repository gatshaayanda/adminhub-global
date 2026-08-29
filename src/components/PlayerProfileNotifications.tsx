"use client";

import { useEffect, useState } from "react";
import { KeyRound, LoaderCircle, LogOut, Save, ShieldCheck } from "lucide-react";
import BrowserPushControl from "@/components/BrowserPushControl";
import GuidePreferenceControl from "@/components/GuidePreferenceControl";
import DeviceOfflineControl from "@/components/DeviceOfflineControl";
import { useBoardSignalConnectivity } from "@/components/ConnectivityProvider";
import { isValidBoardSignalEmail } from "@/lib/boardsignal/delivery";
import { readGoogleEmailPrefill, rememberGoogleEmailPrefill, requestGoogleAccessCredential } from "@/lib/boardsignal/client/googleAccess";
import { BOARDSIGNAL_SUPPORT_DISCORD_URL } from "@/lib/boardsignal/client/firestoreQuota";
import type {
  BoardSignalAccount,
  BoardSignalContactMethod,
  BoardSignalNotificationPreferences,
  BoardSignalPrivacySettings,
} from "@/lib/boardsignal/account";

export default function PlayerProfileNotifications({
  account,
  uid,
  token,
  onSaved,
  onSignOut,
}: {
  account: BoardSignalAccount;
  uid: string;
  token: string;
  onSaved: () => Promise<void>;
  onSignOut: () => Promise<void> | void;
}) {
  const connectivity = useBoardSignalConnectivity();
  const [method, setMethod] = useState<BoardSignalContactMethod>(account.preferredContactMethod ?? "email");
  const [contact, setContact] = useState(account.preferredContactValue ?? "");
  const [consent, setConsent] = useState(account.betaContactConsent === true);
  const [notifications, setNotifications] = useState<BoardSignalNotificationPreferences>(account.notificationPreferences);
  const [privacy, setPrivacy] = useState<BoardSignalPrivacySettings>(account.privacy);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleMessage, setGoogleMessage] = useState("");
  const [googleError, setGoogleError] = useState("");

  useEffect(() => {
    if (account.preferredContactValue || method !== "email" || contact.trim()) return;
    const prefill = readGoogleEmailPrefill();
    if (prefill) setContact(prefill);
  }, [account.preferredContactValue, contact, method]);

  function notificationToggle(key: keyof Pick<BoardSignalNotificationPreferences, "deskReady" | "episodeProgress" | "blueReminder" | "universeAchievement" | "founderUpdates">, label: string) {
    return <label className="profile-toggle"><span><strong>{label}</strong><small>In-app messages{notifications.browserPush ? " and eligible browser alerts" : ""}</small></span><input type="checkbox" checked={notifications[key]} onChange={(event) => setNotifications((value) => ({ ...value, [key]: event.target.checked }))} /></label>;
  }

  const emailContactReady = method === "email" && consent && isValidBoardSignalEmail(contact);

  async function connectGoogle() {
    if (!connectivity.online) { setGoogleError("Reconnect before connecting Google access."); return; }
    setGoogleBusy(true);
    setGoogleError("");
    setGoogleMessage("");
    try {
      const credential = await requestGoogleAccessCredential();
      const response = await fetch("/api/boardsignal/google-access", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ action: "link", googleIdToken: credential.googleIdToken }),
      });
      const body = await response.json() as { ok?: boolean; result?: { linkedAt?: string; verifiedEmail?: string; chessComOwnershipVerified?: boolean }; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Google access could not be connected.");
      const email = credential.email ?? body.result?.verifiedEmail;
      if (email) {
        rememberGoogleEmailPrefill(email);
        if (method === "email" && !contact.trim()) setContact(email);
      }
      setGoogleMessage("Google Access connected. It returns to this exact BoardSignal; Chess.com ownership verification remains a separate process.");
      await onSaved();
    } catch (reason) {
      setGoogleError(reason instanceof Error ? reason.message : "Google access could not be connected.");
    } finally {
      setGoogleBusy(false);
    }
  }

  async function save() {
    if (!connectivity.online) { setError("Reconnect before changing account or notification settings."); return; }
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      const response = await fetch("/api/boardsignal/player-room", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePreferences",
          privacy: { ...privacy, publicPlayerPage: true, universeCoverage: true },
          notificationPreferences: { ...notifications, email: emailContactReady ? notifications.email : false },
          contact: {
            preferredContactMethod: method,
            preferredContactValue: contact.trim(),
            betaContactConsent: consent,
          },
        }),
      });
      const body = await response.json() as { ok: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Profile could not be saved.");
      setSaved(true);
      await onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Profile could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="player-profile-section">
    <div className="room-section-heading"><div><p className="kicker">STAY CONNECTED / ACCESS</p><h2>Your BoardSignal account</h2><p>Identity stays tied to your stable Chess.com player ID. Google, email, browser alerts and Discord are independent optional connections.</p></div></div>
    <div className="profile-settings-grid">
      <article className="profile-settings-card"><h3>Account</h3><dl><div><dt>Chess.com username</dt><dd>{account.chessCom.canonicalUsername}</dd></div><div><dt>Private access</dt><dd>{account.accessStatus === "active" ? "Active" : account.accessStatus}</dd></div><div><dt>Chess.com identity</dt><dd>{account.identityStatus === "oauth_verified" ? "Ownership verified with Chess.com" : "Public Chess.com identity"}</dd></div></dl></article>

      <article className="profile-settings-card"><h3>Google Access</h3><div className="profile-contact-status"><span>BoardSignal return key</span><strong>{account.googleAccessConnectedAt ? "Connected" : "Not connected"}</strong></div><div className="required-participation-row"><KeyRound size={17}/><div><strong>Easy secure return</strong><p>Google can bring you back to this exact BoardSignal UID. It does not prove ownership of the Chess.com profile, merge accounts, or change public identity.</p></div></div>{account.googleAccessConnectedAt ? <p className="profile-helper">Connected {new Date(account.googleAccessConnectedAt).toLocaleDateString()}. Existing private access, recovery and current sessions remain available.</p> : <button className="button button-outline" type="button" onClick={() => void connectGoogle()} disabled={googleBusy || !connectivity.online}>{googleBusy ? <><LoaderCircle className="button-spinner" size={14}/> Connecting</> : "CONNECT GOOGLE"}</button>}{googleError ? <p className="form-error" role="alert">{googleError}</p> : null}{googleMessage ? <p className="form-success" role="status">{googleMessage}</p> : null}</article>

      <article className="profile-settings-card"><h3>Email</h3><div className="profile-contact-status"><span>BoardSignal contact</span><strong>{account.preferredContactMethod === "email" && account.preferredContactValue ? account.preferredContactValue : "Not opted in"}</strong></div><label>Preferred contact<select value={method} onChange={(event) => setMethod(event.target.value as BoardSignalContactMethod)}><option value="email">Email</option><option value="discord">Discord</option><option value="telegram">Telegram</option></select></label><label>Contact value<input value={contact} onChange={(event) => setContact(event.target.value)} type={method === "email" ? "email" : "text"} maxLength={160} /></label><label className="agreement-check"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>I agree BoardSignal may contact me about my BoardSignal account, Review availability, important product updates and BoardSignal feedback.</span></label><p className="profile-helper">Google may pre-fill an email for convenience, but it never switches this consent on. Google authentication is not marketing consent, Trustpilot consent or notification consent.</p></article>

      <article className="profile-settings-card"><h3>Email alerts</h3>{notificationToggle("deskReady", "Review Ready")}{notificationToggle("episodeProgress", "This Week Progress")}{notificationToggle("blueReminder", "Focus Next Reminder")}{notificationToggle("universeAchievement", "Around BoardSignal Highlight")}{notificationToggle("founderUpdates", "Founder Updates")}<div className="profile-email-alerts"><p className="kicker">EMAIL ALERTS</p><label className="profile-toggle"><span><strong>Email me important BoardSignal updates</strong><small>{emailContactReady ? "Review Ready, major BoardSignal updates, feedback requests and other important eligible messages only." : "Choose Email as your preferred contact, enter a valid address and explicitly keep BoardSignal contact consent enabled first."}</small></span><input type="checkbox" checked={emailContactReady && notifications.email} disabled={!emailContactReady} onChange={(event) => setNotifications((value) => ({ ...value, email: event.target.checked }))} /></label></div></article>

      <article className="profile-settings-card"><h3>Browser alerts</h3><BrowserPushControl idToken={token} onChanged={onSaved} /></article>

      <article className="profile-settings-card"><h3>Community</h3><div className="required-participation-row"><ShieldCheck size={17}/><div><strong>Founding Access public highlights = Included</strong><p>Each completed Review can contribute a safe positive or neutral highlight. Private improvement guidance, reviewed positions and Progress stay private.</p></div></div><div className="required-participation-row"><ShieldCheck size={17}/><div><strong>BoardSignal Discord</strong><p>Optional community and founder contact. Discord is never required for access and is not identity proof.</p></div></div><a className="button button-outline" href={BOARDSIGNAL_SUPPORT_DISCORD_URL} target="_blank" rel="noreferrer noopener">JOIN THE BOARDSIGNAL DISCORD</a></article>

      <article className="profile-settings-card"><h3>Ask BoardSignal</h3><GuidePreferenceControl token={token} /></article>

      <article className="profile-settings-card"><h3>BoardSignal on this device</h3><DeviceOfflineControl uid={uid} onRefresh={onSaved} /></article>

      <article className="profile-settings-card"><h3>Optional public controls</h3><p className="profile-helper">Public highlights still follow the existing identity and public-safety gates. Google Access does not change them.</p><label className="profile-toggle"><span><strong>Additional positive highlights</strong><small>Beyond the required minimal safe coverage</small></span><input type="checkbox" checked={privacy.additionalPositiveHighlights === true} onChange={(event) => setPrivacy((value) => ({ ...value, additionalPositiveHighlights: event.target.checked }))} /></label><label className="profile-toggle"><span><strong>Direct public game links</strong><small>Where a safe public item supports them</small></span><input type="checkbox" checked={privacy.publicGameLinks === true} onChange={(event) => setPrivacy((value) => ({ ...value, publicGameLinks: event.target.checked }))} /></label><label className="profile-toggle"><span><strong>Expanded public profile details</strong><small>Optional profile context beyond the minimal sports identity</small></span><input type="checkbox" checked={privacy.expandedPublicProfile === true} onChange={(event) => setPrivacy((value) => ({ ...value, expandedPublicProfile: event.target.checked }))} /></label></article>
    </div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    {saved ? <p className="form-success" role="status">Profile saved.</p> : null}
    <div className="profile-actions"><button className="button button-lime" type="button" onClick={save} disabled={busy || !connectivity.online || (consent && !contact.trim())}>{busy ? <><LoaderCircle className="button-spinner" size={15}/> Saving</> : <><Save size={15}/> Save profile</>}</button><button className="button button-quiet" type="button" onClick={onSignOut}><LogOut size={15}/> Sign out</button></div>
  </section>;
}
