/* BoardSignal browser engine bridge. Stockfish is distributed under GPL-3.0. */
importScripts("./stockfish.js");

let engine = null;
const pending = [];

self.onmessage = (event) => {
  if (engine) engine.postMessage(event.data);
  else pending.push(event.data);
};

self.Stockfish().then((instance) => {
  engine = instance;
  engine.addMessageListener((line) => self.postMessage(line));
  for (const command of pending.splice(0)) engine.postMessage(command);
  self.postMessage("boardsignal-engine-ready");
});
