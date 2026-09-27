export const PLAYER_ROOM_QUIET_REFRESH_COOLDOWN_MS = 5_000;

export class PlayerRoomRefreshGate {
  private inFlight: Promise<boolean> | null = null;
  private trailing: (() => Promise<boolean>) | null = null;
  private lastQuietStartedAt = 0;

  run(task: () => Promise<boolean>, options: { quiet: boolean; now?: number } = { quiet: false }): Promise<boolean> {
    const now = options.now ?? Date.now();
    if (this.inFlight) {
      // Coalesce any event that arrives while a load is running into one trailing refresh.
      // Explicit Retry still waits for the current request rather than starting a duplicate.
      this.trailing = task;
      return this.inFlight;
    }
    if (options.quiet && now - this.lastQuietStartedAt < PLAYER_ROOM_QUIET_REFRESH_COOLDOWN_MS) {
      return Promise.resolve(false);
    }
    if (options.quiet) this.lastQuietStartedAt = now;

    const current = task().finally(() => {
      this.inFlight = null;
      const trailing = this.trailing;
      this.trailing = null;
      if (trailing) queueMicrotask(() => { void this.run(trailing, { quiet: true }); });
    });
    this.inFlight = current;
    return current;
  }
}

export function isLiveDataUnavailableResponse(status: number, code?: string) {
  return status === 503 && [
    "FIRESTORE_QUOTA_EXHAUSTED",
    "BOARDSIGNAL_DATA_TEMPORARILY_UNAVAILABLE",
    "BOARDSIGNAL_UNIVERSE_BOOTSTRAPPING",
    "FOUNDER_OPERATIONS_BOOTSTRAPPING",
  ].includes(String(code ?? ""));
}
