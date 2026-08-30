const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const guide = require(path.join(root, '.test-dist-ask/src/lib/boardsignal/guide.js'));
const loader = require(path.join(root, '.test-dist-ask/src/lib/boardsignal/friendsLoader.js'));
const serverGuide = read('src/lib/boardsignal/server/guide.ts');
const guideRoute = read('src/app/api/boardsignal/guide/route.ts');
const widget = read('src/components/AskBoardSignal.tsx');
const profileControl = read('src/components/GuidePreferenceControl.tsx');
const playerRoom = read('src/components/BoardSignalPlayerRoom.tsx');
const playerFriends = read('src/components/PlayerFriends.tsx');
const offlineGuide = read('src/lib/boardsignal/offline/guide.ts');
const roomRoute = read('src/app/api/boardsignal/player-room/route.ts');
const comms = read('src/lib/boardsignal/server/communications.ts');
const social = read('src/lib/boardsignal/server/social.ts');
const universe = read('src/lib/boardsignal/universe.ts');
const pulse = read('src/lib/boardsignal/pulse.ts');
const rules = read('firestore.rules');
const css = read('src/app/globals.css');
const layout = read('src/app/layout.tsx');
const chrome = read('src/components/RouteAwarePublicChrome.tsx');
const usernameForm = read('src/components/UsernameDeskForm.tsx');
const googleSignInButton = read('src/components/GoogleSignInButton.tsx');

function context(extra = {}) {
  return {
    authenticated: true,
    pathname: '/boardsignal/player-room',
    activeTab: 'desk',
    canonicalUsername: 'Ayandakopano',
    preferences: { ...guide.DEFAULT_GUIDE_PREFERENCES },
    tourState: 'completed',
    releaseHintDismissed: true,
    ...extra,
  };
}

function section(source, start, end) {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing ${start}`);
  const to = end ? source.indexOf(end, from + start.length) : source.length;
  return source.slice(from, to < 0 ? source.length : to);
}

test('guest Ask never receives private player context', () => {
  const response = guide.renderGuideResponse('what_changed', { authenticated:false, pathname:'/' });
  assert.match(response.reply, /only show personal changes after you sign in/i);
  assert.doesNotMatch(response.reply, /Signal|Desk 1|Ayandakopano/);
  assert.match(guideRoute, /action === "ask" \? await optionalToken\(request\)/);
  assert.match(widget, /continuityKey\(user\?\.uid\)/);
  assert.match(widget, /uid \|\| "guest"/);
});

test('authenticated Ask resolves the server-verified BoardSignal account', () => {
  assert.match(serverGuide, /const account = await accountForToken\(token\)/);
  assert.match(serverGuide, /canonicalUsername: account\.chessCom\.canonicalUsername/);
  assert.match(guideRoute, /requirePlayerToken\(request\)/);
  assert.doesNotMatch(serverGuide, /input\.userId|input\.uid|input\.playerId/);
});

test('page context changes deterministic suggestions', () => {
  assert.notDeepEqual(guide.pageGuideSuggestions('/boardsignal/player-room','desk',true), guide.pageGuideSuggestions('/boardsignal/player-room','friends',true));
  assert.deepEqual(guide.pageGuideSuggestions('/boardsignal/player-room','inbox',true), ["What's unread?", 'Message Ayanda']);
  assert.equal(guide.detectGuideIntent('Get my BoardSignal', { pathname:'/', activeTab:undefined }), 'beta_next');
  assert.equal(guide.detectGuideIntent('Why am I here?', { pathname:'/feed', activeTab:'universe' }), 'universe_what');
  assert.equal(guide.detectGuideIntent('Explain this simply', { pathname:'/boardsignal/player-room', activeTab:'agreement' }), 'agreement');
});

test('What Changed only uses factual saved activity and never invents movement', () => {
  const changed = guide.renderGuideResponse('what_changed', context({ pulseFacts:[{eyebrow:'SINCE YOU WERE AWAY',title:'6 games entered this episode.',body:'5W · 1L',facts:['Rapid moved +18.']}] }));
  assert.match(changed.reply, /6 games entered this episode/i);
  assert.match(changed.reply, /5W · 1L/);
  assert.match(changed.reply, /Rapid moved \+18/);
  const unchanged = guide.renderGuideResponse('what_changed', context({ pulseFacts:[] }));
  assert.match(unchanged.reply, /won't manufacture movement/i);
  assert.doesNotMatch(unchanged.reply, /moved \+|entered the Top|win run reached/i);
});

test('rank and friend explanations use deterministic safe sources', () => {
  const ranking = guide.renderGuideResponse('explain_rank', context({ standings:[{categoryTitle:'Winning Run',scopeLabel:'Rapid',rank:3,denominator:12,valueLabel:'5 straight'}] }));
  assert.match(ranking.reply, /#3 of 12 in Winning Run · Rapid/);
  assert.match(ranking.reply, /deterministic completed-Review field/);
  assert.match(universe, /rank|standing|category/i);

  const comparison = guide.renderGuideResponse('compare_friend', context({ comparison:{left:{playerId:1,canonicalUsername:'Ayanda',desksAvailable:4},right:{playerId:2,canonicalUsername:'snoopyissocute',desksAvailable:4},recentFourLabel:'RECENT FOUR-DESK VIEW',comparablePools:['rapid'],metrics:[{key:'score',label:'RECENT FORM',leftValue:'67.6%',rightValue:'61.2%'}],universe:[],gameLinksEnabled:{left:false,right:false},privateFieldsExcluded:true} }));
  assert.match(comparison.reply, /67\.6% vs snoopyissocute 61\.2%/i);
  assert.doesNotMatch(comparison.reply, /Red|Amber|Blue|evidence/);
  assert.match(serverGuide, /headToHead\(account, friend\.playerId\)/);
  assert.match(social, /privateFieldsExcluded|Head-to-Head/i);
});

test('Ask never runs new random-position engine analysis', () => {
  const intent = guide.detectGuideIntent('What is the best move in this random position?', {pathname:'/boardsignal/player-room',activeTab:'desk'});
  assert.equal(intent, 'random_position');
  assert.match(guide.renderGuideResponse(intent, context()).reply, /don't create new chess analysis/i);
  assert.doesNotMatch(serverGuide, /Stockfish|analy[sz]ePosition|processor/i);
});

test('preferences and account-changing actions require explicit confirmation', () => {
  assert.match(serverGuide, /input\.confirmed !== true/);
  assert.match(serverGuide, /collection\("guide"\)\.doc\("profile"\)\.set/);
  assert.match(profileControl, /preferredTone/);
  const response = guide.renderGuideResponse('tone', context());
  assert.ok(response.actions.every((action) => action.kind !== 'preference' || action.requiresConfirmation === true));
  assert.match(widget, /window\.confirm/);
});

test('Guide profile avoids psychological diagnosis or manipulation fields', () => {
  const forbidden = guide.forbiddenGuideProfileFields();
  assert.ok(forbidden.includes('mentalHealthDiagnosis'));
  assert.ok(forbidden.includes('psychologicalSusceptibility'));
  for (const key of forbidden) assert.equal(Object.prototype.hasOwnProperty.call(guide.DEFAULT_GUIDE_PREFERENCES, key), false);
  assert.doesNotMatch(serverGuide, /manipulationScore\s*:|psychologicalSusceptibility\s*:|depressed\s*:|anxious\s*:/);
});

test('human handoff stays inside the existing private conversation and excludes secrets', () => {
  assert.match(serverGuide, /collection\("conversations"\)/);
  assert.match(serverGuide, /collection\("messages"\)/);
  assert.match(serverGuide, /unreadForFounder:\s*true/);
  assert.match(comms, /collection\("conversations"\)/);
  const handoff = section(serverGuide, 'export async function createGuideHandoff', 'export async function founderGuideSummary');
  assert.match(handoff, /Player:|Page:|Latest completed Review:|Current episode:|Category:/);
  assert.doesNotMatch(handoff, /accessCode|preferredContactValue|Authorization|evidence|privateKey|vapid/i);
});

test('guest onboarding help remains deterministic and Google-first entry stays available', () => {
  const guest = { authenticated:false, pathname:'/join' };
  assert.match(guide.renderGuideResponse('beta_next', guest).reply, /Ayanda reviews identity in the background/i);
  assert.match(guide.renderGuideResponse('username_reason', guest).reply, /stable Chess\.com player ID/i);
  assert.match(guide.renderGuideResponse('privacy', guest).reply, /stay private/i);
  assert.match(usernameForm, /GoogleSignInButton/);
  assert.match(googleSignInButton, /Continue with Google/);
});

test('Guide memory and conversational continuity remain bounded by UID', () => {
  const memory = guide.boundedGuideMemory({recentTopics:['a','b','c','d','e','f'],productSignals:['1','2','3','4','5','6','7','8']}, 'new', '9');
  assert.equal(memory.recentTopics.length, 6);
  assert.equal(memory.productSignals.length, 8);
  assert.match(widget, /slice\(-12\)/);
  assert.match(widget, /continuityKey\(uid\?: string\)/);
  assert.match(widget, /setMessages\(readContinuity\(user\?\.uid\)\)/);
  assert.match(widget, /STORAGE_PREFIX.*uid \|\| "guest"/s);
  const history = Array.from({length:20}, (_,i) => ({ role:i%2?'guide':'player', body:`turn ${i}`, intent:'unknown' }));
  const safe = guide.sanitizeGuideConversation(history);
  assert.equal(safe.length, 12);
  assert.equal(safe[0].body, 'turn 8');
});

test('conversation follow-ups preserve verified provenance instead of trusting client claims', () => {
  const recentConversation = [{ role:'guide', body:'Your Board moved into the Top 3.', intent:'what_changed', provenance:{ kind:'pulse', title:'Latest BoardSignal Pulse' } }];
  const brain = guide.runGuideBrain('Why did you say that?', context({ recentConversation }));
  const response = guide.deterministicGuideRenderer.render(brain);
  assert.equal(brain.intent, 'followup_why');
  assert.match(response.reply, /latest BoardSignal Pulse/i);
  const unsafe = guide.sanitizeGuideConversation([{ role:'guide', body:'hello', intent:'secret_super_intent', provenance:{kind:'firebase_admin_secret',title:'fake'} }]);
  assert.equal(unsafe[0].intent, undefined);
  assert.equal(unsafe[0].provenance, undefined);
});

test('offline Ask remains local, bounded and freshness-aware', () => {
  assert.match(widget, /if \(!connectivity\.online\)[\s\S]*buildOfflineGuideResponse/);
  assert.match(offlineGuide, /renderGuideFollowup/);
  assert.doesNotMatch(offlineGuide, /fetch\(|\/api\/boardsignal\/guide/);
  assert.match(offlineGuide, /sanitizeGuideConversation\(recentConversation\)/);
  assert.match(offlineGuide, /provenance.*offline_snapshot/s);
});

test('Inbox, Friends and Universe remain the factual product surfaces underneath Ask', () => {
  assert.match(serverGuide, /listPlayerInbox/);
  assert.match(widget, /Open Inbox/);
  assert.match(playerRoom, /<PlayerInbox/);
  assert.match(playerRoom, /<PlayerFriends/);
  assert.match(social, /export async function headToHead/);
  assert.match(roomRoute, /recordGuidePlayerRoomSnapshot/);
  assert.match(serverGuide, /capture\.pulse\?\.sinceAway|capture\.pulse\?\.boardMoved/);
  assert.match(pulse, /PlayerPulse|sinceAway|boardMoved/);
});

test('Friends initial load retains the current loading-loop hotfix dependencies', () => {
  assert.equal(loader.shouldRunInitialFriendsLoad(undefined, 'token-a'), true);
  assert.equal(loader.shouldRunInitialFriendsLoad('token-a', 'token-a'), false);
  assert.match(playerFriends, /const onChangedRef = useRef\(onChanged\)/);
  assert.match(playerFriends, /useEffect\(\(\) => \{ onChangedRef\.current = onChanged; \}, \[onChanged\]\)/);
  assert.match(playerFriends, /const load = useCallback[\s\S]*\}, \[messageTarget, token\]\)/);
  assert.doesNotMatch(playerFriends, /\}, \[onChanged, token/);
  assert.match(playerFriends, /loadedTokenRef = useRef<string \| undefined>\(undefined\)/);
  assert.match(playerFriends, /shouldRunInitialFriendsLoad\(loadedTokenRef\.current, token\)/);
  assert.match(playerFriends, /AbortController/);
  assert.match(playerFriends, /12000/);
  assert.match(playerRoom, /const handleFriendsChanged = useCallback\([\s\S]*?\}, \[\]\);/);
  assert.match(playerRoom, /onChanged=\{handleFriendsChanged\}/);
});

test('Ask panel remains a single readable semantic product surface', () => {
  assert.match(layout, /<RouteAwarePublicChrome>\{children\}<\/RouteAwarePublicChrome>/);
  assert.match(chrome, /import AskBoardSignal from "@\/components\/AskBoardSignal"/);
  assert.equal((chrome.match(/<AskBoardSignal\s*\/>/g) || []).length, 1);
  assert.doesNotMatch(layout, /<ChatWidget\s*\/>/);
  assert.doesNotMatch(chrome, /<ChatWidget\s*\/>/);
  assert.doesNotMatch(serverGuide, /fake-bot|OpenAI|Anthropic|LLM/i);
  assert.match(widget, /ask-bs-panel bs-surface-paper/);
  assert.match(widget, /ask-bs-header bs-surface-dark/);
  assert.match(css, /\.ask-bs-panel[\s\S]*color:\s*var\(--bs-text-primary\)/);
  assert.match(css, /\.ask-bs-suggestions button[\s\S]*color:\s*var\(--bs-text-primary\)/);
  assert.match(css, /\.ask-bs-composer input[\s\S]*color:\s*var\(--bs-text-primary\)/);
});

test('mobile Ask controls keep 44px targets and avoid bottom navigation', () => {
  assert.match(css, /\.ask-bs \{ right: max\(12px, env\(safe-area-inset-right\)\); bottom: max\(84px/);
  assert.match(css, /\.ask-bs-panel \{ position: fixed; inset: max\(8px, env\(safe-area-inset-top\)\) 8px max\(74px/);
  assert.match(css, /\.ask-bs-feedback button \{ min-height: 44px/);
  assert.match(css, /\.ask-bs-suggestions button \{[^}]*min-height: 44px/);
});

test('Ask failure is isolated from Player Room', () => {
  assert.match(roomRoute, /recordGuidePlayerRoomSnapshot[\s\S]*\.catch\(\(\) => undefined\)/);
  assert.match(widget, /Ask BoardSignal isn't available right now/);
  assert.match(widget, /Open Inbox/);
});

test('full active-cascade contrast invariant remains a release gate', () => {
  cp.execFileSync(process.execPath, [path.join(root,'scripts/check-boardsignal-contrast.mjs')], { cwd:root, stdio:'pipe' });
});

test('Ask private persistence remains owner-only', () => {
  const guideRules = section(rules, 'match /guide/{guideId} {', 'match /guideFeedback/{feedbackId} {');
  const feedbackRules = section(rules, 'match /guideFeedback/{feedbackId} {', '\n    }\n\n    match /publicPlayers/');
  assert.match(guideRules, /allow read: if isOwner\(userId\);/);
  assert.match(guideRules, /allow write: if false;/);
  assert.doesNotMatch(guideRules, /allow read: if true;/);
  assert.match(feedbackRules, /allow read: if isOwner\(userId\);/);
  assert.match(feedbackRules, /allow write: if false;/);
  assert.doesNotMatch(feedbackRules, /allow read: if true;/);
});