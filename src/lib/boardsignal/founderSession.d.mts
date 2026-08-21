export const FOUNDER_SESSION_COOKIE: string;
export const FOUNDER_SESSION_VERSION: number;
export const FOUNDER_SESSION_MAX_AGE_SECONDS: number;
export function createFounderSession(adminPassword: string, options?: { nowMs?: number; nonce?: string }): Promise<{ value: string; payload: { v: number; role: "founder"; iat: number; exp: number; nonce: string }; maxAge: number; expires: Date }>;
export function verifyFounderSession(value: string | undefined, adminPassword: string | undefined, options?: { nowMs?: number }): Promise<boolean>;
export function founderPasswordFromBasicHeader(authorization: string | undefined): string | undefined;
export function verifyFounderBasicAuthorization(authorization: string | undefined, adminPassword: string | undefined): boolean;
export function verifyFounderAuthorization(input: { sessionValue?: string; authorization?: string; adminPassword?: string; nowMs?: number }): Promise<{ authorized: boolean; method: "session" | "basic" | "none"; reason?: string }>;
