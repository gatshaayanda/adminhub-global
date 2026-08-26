const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { Chess } = require("chess.js");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const understandingSource = read("src/lib/boardsignal/chessUnderstanding.ts");
const humanSource = read("src/lib/boardsignal/humanMoveModel.ts");
const openingSource = read("src/lib/boardsignal/openingClassification.ts");
const processor = read("src/lib/boardsignal/processor.ts");
const interpretation = read("src/lib/boardsignal/interpretation.ts");
const quality = read("src/lib/boardsignal/quality.ts");
const memory = read("src/lib/boardsignal/memory.ts");
const reviewHistory = read("src/lib/boardsignal/reviewHistory.ts");
const deskUi = read("src/components/UniversalPlayerDesk.tsx");
const persistence = read("src/lib/boardsignal/server/persistence.ts");
const contract = read("BOARD_SIGNAL_PRODUCT_CONTRACT.md");
const openingData = JSON.parse(read("src/data/boardsignal/lichess-openings.json"));

const dist = path.join(root, ".test-dist-understanding");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

function compile(source, target) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2017,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  assert.equal(errors.length, 0, errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")).join("\n"));
  fs.writeFileSync(path.join(dist, target), result.outputText);
}
compile(humanSource, "humanMoveModel.js");
compile(understandingSource, "chessUnderstanding.js");
const understanding = require(path.join(dist, "chessUnderstanding.js"));
const human = require(path.join(dist, "humanMoveModel.js"));

test("1. hanging / sole-defender removal becomes deterministic piece-safety teaching", () => {
  const before = "4k3/8/4p3/5N2/8/3B4/8/4K3 w - - 0 1";
  const chess = new Chess(before);
  chess.move({ from: "d3", to: "e2" });
  const after = chess.fen();
  const lesson = understanding.understandCandidate({
    id: "P01",
    gameId: "g1",
    gameUrl: "https://example.invalid/game/1",
    opponent: "opponent",
    playerColor: "white",
    result: "loss",
    role: "correction",
    kind: "player-move",
    motif: "material",
    movePlayed: "Be2",
    movePlayedUci: "d3e2",
    fenBefore: before,
    fenAfter: after,
    fen: before,
    reconstruction: "legal",
  }, {
    id: "P01",
    depth: 11,
    status: "complete",
    beforeCp: 20,
    afterCp: -260,
    evaluationLossCp: 280,
    bestMove: "d3c4",
    strongestOpponentReply: "e6f5",
    strongestOpponentReplySan: "exf5",
    forcingLineUci: ["e6f5"],
  });
  assert.equal(lesson.status, "supported");
  assert.equal(lesson.conceptId, "piece_safety");
  assert.match(lesson.whatYouCouldHaveNoticed, /only piece protecting/i);
  assert.match(lesson.nextGameRule, /moving a defender/i);
});

test("2. immediate engine check/mate becomes king-safety or forcing-reply evidence without mind reading", () => {
  const chess = new Chess();
  chess.move("f3"); chess.move("e5");
  const before = chess.fen();
  chess.move("g4");
  const after = chess.fen();
  const lesson = understanding.understandCandidate({
    id: "P02", gameId: "g2", gameUrl: "https://example.invalid/game/2",
    opponent: "opponent", playerColor: "white", result: "loss", role: "correction",
    kind: "player-move", motif: "king-safety", movePlayed: "g4", movePlayedUci: "g2g4",
    fenBefore: before, fenAfter: after, fen: before, reconstruction: "legal",
  }, {
    id: "P02", depth: 11, status: "complete", beforeCp: 0, afterMate: -1,
    evaluationLossCp: 1000, bestMove: "g2g3", strongestOpponentReply: "d8h4",
    strongestOpponentReplySan: "Qh4#", forcingLineUci: ["d8h4"],
  });
  assert.equal(lesson.status, "supported");
  assert.equal(lesson.conceptId, "king_safety");
  assert.doesNotMatch(`${lesson.whatHappened} ${lesson.whatYouCouldHaveNoticed}`, /failed to calculate/i);
});

test("3. structural facts expose development, king state, centre and pawn structure deterministically", () => {
  const facts = understanding.structuralFacts(new Chess().fen(), "white");
  assert.deepEqual(facts.undevelopedMinorSquares, ["b1", "c1", "f1", "g1"]);
  assert.equal(facts.kingSquare, "e1");
  assert.equal(facts.castled, false);
  assert.ok(Array.isArray(facts.centerControlSquares));
  assert.ok(Array.isArray(facts.openFiles));
  assert.ok(Array.isArray(facts.doubledPawnFiles));
  assert.ok(Array.isArray(facts.isolatedPawnFiles));
  assert.ok(Array.isArray(facts.passedPawnSquares));
});

test("4. pinned local Lichess CC0 opening index recognizes the Scandinavian position", () => {
  assert.equal(openingData.meta.source, "lichess-org/chess-openings");
  assert.equal(openingData.meta.commit, "4b8622759e7ae6f93f011cc6c83a3823401ab45e");
  assert.equal(openingData.meta.license, "CC0-1.0");
  const chess = new Chess();
  chess.move("e4"); chess.move("d5");
  const key = chess.fen().split(/\s+/).slice(0, 4).join(" ");
  const hit = openingData.positions[key];
  assert.ok(hit);
  assert.equal(hit[0], "B01");
  assert.match(hit[1], /Scandinavian Defense/);
});

test("5. opening name is metadata and cannot be causal evidence by itself", () => {
  assert.match(openingSource, /source: "lichess_cc0"/);
  assert.match(quality, /OPENING_NAME_USED_AS_CAUSAL_EVIDENCE/);
  assert.match(understandingSource, /playerQueenMovesBefore/);
  assert.match(understandingSource, /undevelopedMinorSquares/);
  assert.doesNotMatch(understandingSource, /leaving theory.*error/i);
});

test("6. selected educational positions use bounded MultiPV while the global position cap remains eight", () => {
  assert.match(deskUi, /ENGINE_EDUCATIONAL_MULTIPV = 2/);
  assert.match(deskUi, /MAX_MULTIPV_CANDIDATES = 3/);
  assert.match(deskUi, /setoption name MultiPV value/);
  assert.match(deskUi, /forcingLineUci/);
  assert.match(quality, /POSITION_LIMIT_EXCEEDED/);
  assert.match(processor, /selectCandidates\(selectedGames, canonical, 8\)/);
});

test("7. plain-language-first teaching order is rendered before optional terminology", () => {
  const happened = deskUi.indexOf("WHAT HAPPENED");
  const clue = deskUi.indexOf("WHAT YOU COULD HAVE NOTICED");
  const why = deskUi.indexOf("WHY IT MATTERED");
  const name = deskUi.indexOf("CHESS NAME");
  const rule = deskUi.indexOf("NEXT-GAME RULE");
  assert.ok(happened >= 0 && happened < clue && clue < why && why < name && name < rule);
});

test("8. concept recurrence rides the already-retained Review history instead of adding Firestore reads", () => {
  assert.match(memory, /conceptIds\?: ChessUnderstandingConceptId\[\]/);
  assert.match(reviewHistory, /conceptIds: summary\.conceptIds/);
  assert.match(reviewHistory, /review\.conceptIds \?\? \[\]/);
  assert.doesNotMatch(understandingSource, /firebase|getAdminDb|collection\(/i);
  assert.doesNotMatch(openingSource, /firebase|getAdminDb|fetch\(/i);
  assert.doesNotMatch(humanSource, /firebase|getAdminDb|fetch\(/i);
  assert.match(persistence, /const retained = await retainedDeskSnapshots\(account\.uid\)/);
});

test("9. low-confidence interpretation is withheld rather than manufactured", () => {
  const lesson = understanding.understandCandidate({
    id: "P03", gameId: "g3", gameUrl: "https://example.invalid/game/3",
    opponent: "opponent", playerColor: "white", result: "loss", role: "correction",
    kind: "player-move", motif: "general", movePlayed: "a3", movePlayedUci: "a2a3",
    fenBefore: new Chess().fen(), fenAfter: new Chess().fen(), fen: new Chess().fen(),
    reconstruction: "legal",
  }, { id: "P03", depth: 11, status: "complete", evaluationLossCp: 30 });
  assert.equal(lesson.status, "withheld");
  assert.equal(lesson.confidence, "low");
});

test("10. human-move adapter is reviewed but unavailable by default and Maia-3 stays licence-blocked", async () => {
  assert.equal(human.HUMAN_MOVE_MODEL_REVIEW.maia2.license, "MIT");
  assert.equal(human.HUMAN_MOVE_MODEL_REVIEW.maia3.license, "AGPL-3.0");
  assert.equal(human.HUMAN_MOVE_MODEL_REVIEW.maia3.boardSignalStatus, "blocked_pending_explicit_license_approval");
  assert.equal(human.unavailableHumanMoveModelAdapter.available, false);
  assert.equal(await human.unavailableHumanMoveModelAdapter.predict({ fen: new Chess().fen() }), undefined);
});

test("11. full position-specific analysis remains completed-game only", () => {
  assert.match(processor, /completedGameCutoffSeconds/);
  assert.match(processor, /game\.end_time <= completedGameCutoffSeconds/);
  const currentStart = processor.indexOf("export async function buildCurrentEpisodeSummary");
  const current = processor.slice(currentStart);
  assert.doesNotMatch(current, /buildDeskUnderstanding|MultiPV|Stockfish/);
  assert.match(contract, /completed-game only/);
  assert.match(contract, /never analyze an ongoing Chess\.com game/);
});

test("12. existing publication gates are strengthened, not bypassed", () => {
  assert.match(quality, /ENGINE_REVIEW_INCOMPLETE/);
  assert.match(quality, /RED_REPEATED_EVIDENCE_MISSING/);
  assert.match(quality, /BLUE_NOT_DERIVED_FROM_RED/);
  assert.match(quality, /UNDERSTANDING_EVIDENCE_INVALID/);
  assert.match(interpretation, /buildDeskUnderstanding/);
  assert.match(interpretation, /boardsignal-rules-1\.2\.0/);
});
