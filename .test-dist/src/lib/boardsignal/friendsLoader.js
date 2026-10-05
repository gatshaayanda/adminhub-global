"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldRunInitialFriendsLoad = shouldRunInitialFriendsLoad;
/**
 * Keeps the Friends initial overview fetch tied to authentication identity only.
 * Parent render/callback identity changes must never create another initial load.
 */
function shouldRunInitialFriendsLoad(previousToken, token) {
    return Boolean(token) && previousToken !== token;
}
