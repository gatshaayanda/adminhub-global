"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import BoardSignalHistoryWorker from "@/components/BoardSignalHistoryWorker";
import BoardSignalPlayerRoom from "@/components/BoardSignalPlayerRoom";
import UsernameDeskForm from "@/components/UsernameDeskForm";
import { auth } from "@/utils/firebaseConfig";

export default function BoardSignalPlayerRoomGate() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (activeUser) => {
    setUser(activeUser);
    setReady(true);
  }), []);

  if (!ready) {
    return (
      <div id="main" className="container player-room-entry bs-surface-paper" aria-live="polite">
        <p className="kicker">MY BOARDSIGNAL</p>
        <h1>Opening BoardSignal…</h1>
        <p>Checking whether this device already has your signed-in BoardSignal.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div id="main" className="container player-room-entry boardsignal-google-entry-page">
        <p className="kicker">MY BOARDSIGNAL</p>
        <h1>Open your chess app with Google.</h1>
        <p className="player-room-entry-copy">The same Google button starts a new BoardSignal or returns you to the one you already use. No beta password and no Chess.com password.</p>
        <UsernameDeskForm />
      </div>
    );
  }

  return <><BoardSignalPlayerRoom /><BoardSignalHistoryWorker /></>;
}
