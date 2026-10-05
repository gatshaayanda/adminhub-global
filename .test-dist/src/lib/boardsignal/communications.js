"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ORDINARY_EPISODE_EVENT_TYPES = void 0;
exports.automatedEventKey = automatedEventKey;
exports.evaluateAutomationPolicy = evaluateAutomationPolicy;
exports.preferenceAllowsMessage = preferenceAllowsMessage;
exports.messageForAutomatedEvent = messageForAutomatedEvent;
const delivery_1 = require("./delivery");
exports.ORDINARY_EPISODE_EVENT_TYPES = new Set([
    "episode_started",
    "episode_progress",
    "blue_reminder_available",
    "universe_achievement",
    "universe_top3",
    "inactive_episode",
]);
function automatedEventKey(eventType, details) {
    return [eventType, details.deskKey ?? details.episodeKey ?? "global", details.discriminator ?? "default"].join(":");
}
function evaluateAutomationPolicy(input) {
    if (input.previous.some((event) => event.eventKey === input.eventKey)) {
        return { allowed: false, pushAllowed: false, reason: "duplicate" };
    }
    const ordinaryInEpisode = input.episodeKey
        ? input.previous.filter((event) => event.episodeKey === input.episodeKey && exports.ORDINARY_EPISODE_EVENT_TYPES.has(event.eventType)).length
        : 0;
    if (input.eventType !== "desk_ready" && input.episodeKey && ordinaryInEpisode >= 3) {
        return { allowed: false, pushAllowed: false, reason: "episode_cap" };
    }
    const dayAgo = input.now.getTime() - 24 * 60 * 60 * 1000;
    const hasRecentPush = input.previous.some((event) => event.pushSentAt && Date.parse(event.pushSentAt) > dayAgo);
    return {
        allowed: true,
        pushAllowed: !hasRecentPush,
        ...(hasRecentPush ? { reason: "push_24h_cap" } : {}),
    };
}
function preferenceAllowsMessage(preferences, type) {
    switch (type) {
        case "desk_ready": return preferences.deskReady;
        case "episode_update": return preferences.episodeProgress;
        case "blue_reminder": return preferences.blueReminder;
        case "universe_achievement": return preferences.universeAchievement;
        case "friend_request":
        case "friend_accepted": return true;
        case "beta_update":
        case "feedback_request":
        case "custom": return preferences.founderUpdates;
    }
}
function messageForAutomatedEvent(input) {
    if (input.eventType === "desk_ready") {
        return {
            type: "desk_ready",
            title: "Your new BoardSignal Desk is ready",
            body: "Your chess week has a story. Your completed Desk is waiting in My Player Room.",
            link: (0, delivery_1.boardSignalMessageLink)("desk_ready"),
            actionLabel: "Open my Desk",
            allowReply: false,
        };
    }
    if ((input.eventType === "episode_started" || input.eventType === "episode_progress") && input.currentEpisode) {
        return {
            type: "episode_update",
            title: "Your next episode is forming",
            body: input.currentEpisode.games > 0
                ? `${input.currentEpisode.games} game${input.currentEpisode.games === 1 ? " is" : "s are"} already in. This is based on the latest available Chess.com data.`
                : "Your next seven-day episode is open. No games are recorded yet in the latest available Chess.com data.",
            link: (0, delivery_1.boardSignalMessageLink)("episode_update"),
            actionLabel: "See episode progress",
            allowReply: false,
        };
    }
    if (input.eventType === "inactive_episode" && input.currentEpisode) {
        return {
            type: "episode_update",
            title: "Your current BoardSignal episode is still open",
            body: "No games are recorded yet in the latest available Chess.com data. Your Player Room will keep the episode factual while it forms.",
            link: (0, delivery_1.boardSignalMessageLink)("episode_update"),
            actionLabel: "Open My Player Room",
            allowReply: false,
        };
    }
    if (input.eventType === "blue_reminder_available" && input.previousBlue) {
        return {
            type: "blue_reminder",
            title: "Carry this with you today",
            body: `${input.previousBlue.title} — ${input.previousBlue.copy}`,
            link: (0, delivery_1.boardSignalMessageLink)("blue_reminder"),
            actionLabel: "Open My Player Room",
            allowReply: false,
        };
    }
    if ((input.eventType === "universe_achievement" || input.eventType === "universe_top3") && input.universeAchievement) {
        return {
            type: "universe_achievement",
            title: "BoardSignal Universe update",
            body: input.universeAchievement,
            link: (0, delivery_1.boardSignalMessageLink)("universe_achievement"),
            actionLabel: "Open the Universe",
            allowReply: false,
        };
    }
    return undefined;
}
