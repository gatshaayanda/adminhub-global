export const FOUNDER_SESSION_COOKIE: string;
export const FOUNDER_SESSION_VERSION: number;
export const FOUNDER_SESSION_MAX_AGE_SECONDS: number;
export function createFounderSession(adminPassword: string, options?: { nowMs?: number; nonce?: string }): Promise<{ value: string; payload: { v: number; role: "founder"; iat: number; exp: number; nonce: string }; maxAge: number; expires: Date }>;
export function verifyFounderSession(value: string | null | undefined, adminPassword: string | null | undefined, options?: { nowMs?: number }): Promise<boolean>;
export function founderPasswordFromBasicHeader(authorization: string | null | undefined): string | undefined;
export function verifyFounderBasicAuthorization(authorization: string | null | undefined, adminPassword: string | null | undefined): boolean;
export function verifyFounderAuthorization(input: { sessionValue?: string | null; authorization?: string | null; adminPassword?: string | null; nowMs?: number }): Promise<{ authorized: boolean; method: "session" | "basic" | "none"; reason?: string }>;
