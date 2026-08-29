import fs from "node:fs";

function read(file) { return fs.readFileSync(file, "utf8"); }
function write(file, value) { fs.writeFileSync(file, value); }
function replaceExact(file, from, to) {
  let source = read(file);
  if (source.includes(to)) return;
  if (!source.includes(from)) {
    console.warn(`Patch K reconcile: already changed or alternate source in ${file}: ${from.slice(0, 90)}`);
    return;
  }
  source = source.replace(from, to);
  write(file, source);
}
function replaceRegex(file, expression, replacement, alreadyApplied) {
  let source = read(file);
  if (alreadyApplied && source.includes(alreadyApplied)) return;
  if (!expression.test(source)) throw new Error(`Patch K reconcile: expected pattern not found in ${file}: ${expression}`);
  source = source.replace(expression, replacement);
  write(file, source);
}

const room = "src/components/BoardSignalPlayerRoom.tsx";
replaceExact(
  room,
  '  const [socialPlayers, setSocialPlayers] = useState<Record<string, SocialSummaryPlayer>>({});\n  const [friendCompareTarget, setFriendCompareTarget] = useState<number | undefined>();',
  '  const [socialPlayers, setSocialPlayers] = useState<Record<string, SocialSummaryPlayer>>({});\n  const [incomingFriendRequests, setIncomingFriendRequests] = useState(0);\n  const [suggestedPlayerCount, setSuggestedPlayerCount] = useState(0);\n  const [friendCompareTarget, setFriendCompareTarget] = useState<number | undefined>();',
);
replaceExact(
  room,
  '      setSocialPlayers({});\n      setUnreadCount(0);',
  '      setSocialPlayers({});\n      setIncomingFriendRequests(0);\n      setSuggestedPlayerCount(0);\n      setUnreadCount(0);',
);
replaceExact(
  room,
  `  const refreshSocialSummary = useCallback(async () => {\n    if (!token) return;\n    const response = await fetch("/api/boardsignal/social?view=overview", { headers: { Authorization: \`Bearer \${token}\` }, cache: "no-store" });\n    const body = await response.json() as { ok?: boolean; overview?: { friends?: SocialSummaryPlayer[]; incoming?: SocialSummaryPlayer[]; outgoing?: SocialSummaryPlayer[] } };\n    if (!response.ok || !body.ok || !body.overview) return;\n    const players = [...(body.overview.friends ?? []), ...(body.overview.incoming ?? []), ...(body.overview.outgoing ?? [])];\n    setSocialPlayers(Object.fromEntries(players.map((player) => [player.canonicalUsername.toLowerCase(), player])));\n  }, [token]);`,
  `  const refreshSocialSummary = useCallback(async () => {\n    if (!token) return;\n    const headers = { Authorization: \`Bearer \${token}\` };\n    const [overviewResponse, suggestedResponse] = await Promise.all([\n      fetch("/api/boardsignal/social?view=overview", { headers, cache: "no-store" }),\n      fetch("/api/boardsignal/social?view=suggested", { headers, cache: "no-store" }),\n    ]);\n    const overviewBody = await overviewResponse.json() as { ok?: boolean; overview?: { friends?: SocialSummaryPlayer[]; incoming?: SocialSummaryPlayer[]; outgoing?: SocialSummaryPlayer[] } };\n    if (overviewResponse.ok && overviewBody.ok && overviewBody.overview) {\n      const players = [...(overviewBody.overview.friends ?? []), ...(overviewBody.overview.incoming ?? []), ...(overviewBody.overview.outgoing ?? [])];\n      setSocialPlayers(Object.fromEntries(players.map((player) => [player.canonicalUsername.toLowerCase(), player])));\n      setIncomingFriendRequests(overviewBody.overview.incoming?.length ?? 0);\n    }\n    const suggestedBody = await suggestedResponse.json().catch(() => ({})) as { ok?: boolean; players?: SocialSummaryPlayer[] };\n    if (suggestedResponse.ok && suggestedBody.ok) setSuggestedPlayerCount(suggestedBody.players?.length ?? 0);\n  }, [token]);`,
);
replaceExact(
  room,
  `  const handleFriendsChanged = useCallback((overview: { friends: SocialSummaryPlayer[]; incoming: SocialSummaryPlayer[]; outgoing: SocialSummaryPlayer[] }) => {\n    const players = [...overview.friends, ...overview.incoming, ...overview.outgoing];\n    setSocialPlayers(Object.fromEntries(players.map((player) => [player.canonicalUsername.toLowerCase(), player])));\n  }, []);`,
  `  const handleFriendsChanged = useCallback((overview: { friends: SocialSummaryPlayer[]; incoming: SocialSummaryPlayer[]; outgoing: SocialSummaryPlayer[] }) => {\n    const players = [...overview.friends, ...overview.incoming, ...overview.outgoing];\n    setSocialPlayers(Object.fromEntries(players.map((player) => [player.canonicalUsername.toLowerCase(), player])));\n    setIncomingFriendRequests(overview.incoming.length);\n  }, []);`,
);
replaceRegex(
  room,
  /\n  if \(automaticGenerationRequired && !hasOriginalHistory\) \{[\s\S]*?\n  \}\n\n  return \(\n    <div id="main" className="player-room-authenticated">/,
  '\n  return (\n    <div id="main" className="player-room-authenticated">',
  'FirstRoomDiscovery suggestedPlayerCount={suggestedPlayerCount}',
);
replaceExact(
  room,
  '      <RoomNav tab={tab} setTab={setTab} unreadCount={unreadCount} />',
  '      <RoomNav tab={tab} setTab={setTab} unreadCount={unreadCount} friendRequestCount={incomingFriendRequests} />',
);
replaceExact(
  room,
  '        </div>\n        {snapshot.pendingFactualReview ?',
  '          {!latest ? <FirstRoomDiscovery suggestedPlayerCount={suggestedPlayerCount} setTab={setTab} /> : null}\n        </div>\n        {snapshot.pendingFactualReview ?',
);
replaceExact(
  room,
  ': automaticGenerationRequired && hasOriginalHistory ? <div className="container player-room-memory"><div className="founding-field-note"><CalendarDays size={18}/><div><strong>Your original Review is already here.</strong><p>{connectivity.online ? "BoardSignal is building the next eligible LIVE Review from your preserved seven-day cadence." : "Reconnect before BoardSignal retrieves new Chess.com games for your next Review."}</p></div></div>{connectivity.online ? <UniversalPlayerDesk requestedUsername={snapshot.account.chessCom.canonicalUsername} ownerToken={token} cadenceAnchor={originalCadenceAnchor} onFactualReviewReady={saveFactualReview} onDeskPublished={publishDesk} embedded /> : null}</div> : null}',
  ': automaticGenerationRequired ? <div className="container player-room-memory"><div className="founding-field-note"><CalendarDays size={18}/><div><strong>{hasOriginalHistory ? "Your original Review is already here." : "Your Review is forming."}</strong><p>{connectivity.online ? (hasOriginalHistory ? "BoardSignal is building the next eligible LIVE Review from your preserved seven-day cadence." : "BoardSignal is building your first completed Review. You can use Universe, Friends, Inbox and Profile while it forms.") : "Reconnect before BoardSignal retrieves new Chess.com games for this Review."}</p></div></div>{connectivity.online ? <UniversalPlayerDesk requestedUsername={snapshot.account.chessCom.canonicalUsername} ownerToken={token} cadenceAnchor={originalCadenceAnchor} onFactualReviewReady={saveFactualReview} onDeskPublished={publishDesk} embedded /> : null}</div> : null}',
);
replaceExact(room, '<div className="oauth-pending-divider"><span>Need Founding Access?</span></div>', '<div className="oauth-pending-divider"><span>New to BoardSignal?</span></div>');
replaceExact(room, '<p>Founding Access · Private Review</p>', '<p>Private access · Personal Review</p>');
replaceExact(
  room,
  'function RoomNav({ tab, setTab, unreadCount }: { tab: RoomTab; setTab: (tab: RoomTab) => void; unreadCount: number }) {',
  'function RoomNav({ tab, setTab, unreadCount, friendRequestCount }: { tab: RoomTab; setTab: (tab: RoomTab) => void; unreadCount: number; friendRequestCount: number }) {',
);
replaceExact(room, '{ id: "universe", label: "Around BoardSignal" }', '{ id: "universe", label: "Universe" }');
replaceExact(
  room,
  '  }}>{item.label}{item.id === "inbox" && unreadCount > 0 ? <span className="unread-badge" aria-label={`${unreadCount} unread`}>{unreadCount}</span> : null}</button>)}</div></nav>;\n}\n\nfunction CurrentEpisodeCard',
  '  }}>{item.label}{item.id === "friends" && friendRequestCount > 0 ? <span className="unread-badge" aria-label={`${friendRequestCount} incoming friend request${friendRequestCount === 1 ? "" : "s"}`}>{friendRequestCount}</span> : null}{item.id === "inbox" && unreadCount > 0 ? <span className="unread-badge" aria-label={`${unreadCount} unread`}>{unreadCount}</span> : null}</button>)}</div></nav>;\n}\n\nfunction FirstRoomDiscovery({ suggestedPlayerCount, setTab }: { suggestedPlayerCount: number; setTab: (tab: RoomTab) => void }) {\n  return <section className="first-value-preview" aria-label="My BoardSignal is live">\n    <p className="kicker">MY BOARDSIGNAL IS LIVE</p>\n    <h2>Your Review can form without turning the rest of BoardSignal into a waiting room.</h2>\n    <div className="boardsignal-live-proof-grid">\n      <span><strong>YOUR REVIEW</strong> Forming from the current truthful state.</span>\n      <span><strong>THE UNIVERSE</strong> See what is happening across BoardSignal.</span>\n      <span><strong>DISCOVER PLAYERS</strong> {suggestedPlayerCount > 0 ? `${suggestedPlayerCount} available` : "Open discovery"}.</span>\n      <span><strong>STAY CONNECTED</strong> Browser alerts, explicit email and Discord are optional.</span>\n    </div>\n    <div className="resolved-player-actions"><button type="button" className="button button-outline" onClick={() => setTab("universe")}>OPEN UNIVERSE</button><button type="button" className="button button-quiet" onClick={() => setTab("friends")}>DISCOVER PLAYERS</button><button type="button" className="button button-quiet" onClick={() => setTab("profile")}>STAY CONNECTED</button><a className="button button-quiet" href={BOARDSIGNAL_SUPPORT_DISCORD_URL} target="_blank" rel="noreferrer noopener">DISCORD</a></div>\n  </section>;\n}\n\nfunction CurrentEpisodeCard',
);
{
  let source = read(room);
  source = source.replaceAll('AROUND BOARDSIGNAL', 'THE BOARDSIGNAL UNIVERSE');
  source = source.replace(
    'Official standings from each player&apos;s latest eligible completed Review. Current-week comparisons stay private and provisional until the Review closes.',
    'See what&apos;s happening across BoardSignal, discover players, and connect around the chess you&apos;re already playing. Official standings use each player&apos;s latest eligible completed Review; current-week comparisons stay private and provisional until the Review closes.',
  );
  write(room, source);
}

const profile = "src/components/PlayerProfileNotifications.tsx";
{
  let source = read(profile);
  source = source.replace(
    '<div><dt>Chess.com identity</dt><dd>{account.identityStatus === "oauth_verified" ? "Ownership verified with Chess.com" : "Public Chess.com identity"}</dd></div>',
    '<div><dt>Chess.com ownership</dt><dd>{account.identityStatus === "oauth_verified" ? "Verified with Chess.com" : account.identityStatus === "founder_reviewed" ? "BoardSignal-reviewed" : "Provisional / unverified"}</dd></div>',
  );
  source = source.replace('Around BoardSignal Highlight', 'Universe Highlight');
  source = source.replace(
    '<div className="required-participation-row"><ShieldCheck size={17}/><div><strong>Founding Access public highlights = Included</strong><p>Each completed Review can contribute a safe positive or neutral highlight. Private improvement guidance, reviewed positions and Progress stay private.</p></div></div>',
    '<div className="required-participation-row"><ShieldCheck size={17}/><div><strong>Public highlights</strong><p>Positive or neutral public coverage remains subject to BoardSignal identity and public-safety gates. Google Access never unlocks public Chess.com identity by itself.</p></div></div>',
  );
  source = source.replace('I agree BoardSignal may contact me about my Founding Access account, Review availability, important product updates and BoardSignal feedback.', 'I agree BoardSignal may contact me about my BoardSignal account, Review availability, important product updates and BoardSignal feedback.');
  write(profile, source);
}

const agents = "AGENTS.md";
replaceExact(agents, '- Normal onboarding is Chess.com username only. Manual PGN upload is an exceptional recovery path.', '- Public Universe exploration remains available without authentication. New private BoardSignal access is Google-authenticated first, then the player enters and confirms a canonical Chess.com username. Manual PGN upload is an exceptional recovery path.');
replaceExact(agents, '- The homepage\'s primary interaction is Chess.com username entry.', '- The homepage new-private primary action is `Continue with Google`; after Google authentication BoardSignal asks for and confirms the canonical Chess.com username.');
replaceExact(agents, '- Do not put membership, payment, account creation or email verification before a beta Desk.', '- Do not put payment, marketing email consent or Founder approval in front of new private access. Google authentication is the identity gate for new private access; Chess.com ownership remains provisional until separately confirmed.');

const contract = "BOARD_SIGNAL_PRODUCT_CONTRACT.md";
replaceExact(contract, '- The first primary action is `Enter your Chess.com username`.', '- For a new private BoardSignal, the first primary action is `Continue with Google`. After Google authentication, ask for the Chess.com username, resolve the canonical public profile, and require `YES — THIS IS MINE` before creating the private relationship. Public Universe content remains available without authentication.');
replaceExact(contract, '- Ask for no Chess.com password, API key, PGN file, email address, or payment before the player sees their first useful Desk.', '- Never ask for a Chess.com password, API key or routine PGN upload. Google identifies the BoardSignal requester but does not prove Chess.com ownership. Do not infer email, marketing, notification or Trustpilot consent from Google authentication.');
replaceExact(contract, 'Membership, account creation, payments, and email claiming belong after the username-to-beta-quality-Desk loop is reliable. They remain part of the planned full product, but they do not interrupt the first useful experience.', 'Payments remain after the core Review experience is reliable. Patch K makes Google authentication the required identity gate for a brand-new private BoardSignal before the Chess.com username is claimed; public Universe exploration remains available without authentication. Google is not Chess.com ownership proof and does not imply contact, marketing, notification or Trustpilot consent.');
replaceExact(contract, '- Official Chess.com OAuth is the ownership proof when its real credentials and documentation are available. Until then, the provider remains disabled and the public-username LIVE builder remains available. BoardSignal never fakes an OAuth success or asks for a Chess.com password.', '- Official Chess.com OAuth is the ownership proof when its real credentials and documentation are available. Until then, the provider remains disabled and BoardSignal never fakes an OAuth success or asks for a Chess.com password. New private access uses Google to identify the BoardSignal person, then a confirmed canonical Chess.com profile remains provisional/unverified for ownership until Founder-reviewed or future Chess.com OAuth verified.');

console.log("Patch K final access + Universe reconciliation applied.");
