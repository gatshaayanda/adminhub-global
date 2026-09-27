"use client";

import { useState } from "react";
import LiveDataUnavailablePlayerRoom from "@/components/LiveDataUnavailablePlayerRoom";
import { FIRESTORE_QUOTA_EXHAUSTED_CODE } from "@/lib/boardsignal/client/firestoreQuota";
import type { OfflinePlayerRoomSnapshot } from "@/lib/boardsignal/offline/types";

const savedSnapshot: OfflinePlayerRoomSnapshot = {
  version: 1,
  uid: "qa_live_recovery_player",
  canonicalUsername: "CapacityTester",
  savedAt: "2026-09-02T10:00:00.000Z",
  lastSyncedAt: "2026-09-02T10:00:00.000Z",
  desks: [],
  progress: [],
  recurringPatterns: [],
  personalRecords: { desksCompleted: 2, personalBestWinRun: 3, largestPoolSpecificRatingClimb: {} },
  shareMoments: [],
};

export default function LiveRecoveryQaProbe({ saved }: { saved: boolean }) {
  const [retryCount, setRetryCount] = useState(0);
  return <>
    <output data-qa-retry-count={retryCount} hidden>{retryCount}</output>
    <LiveDataUnavailablePlayerRoom
      initialSnapshot={saved ? savedSnapshot : undefined}
      reasonCode={FIRESTORE_QUOTA_EXHAUSTED_CODE}
      onRetry={async () => { setRetryCount((count) => count + 1); return true; }}
    />
  </>;
}
