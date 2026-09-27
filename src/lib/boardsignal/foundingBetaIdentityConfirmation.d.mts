export const IDENTITY_CONFIRMATION_CHANNEL: Readonly<{
  DEVICE: "device";
  EMAIL: "email";
  NONE: "none";
}>;

export const IDENTITY_CONFIRMATION_STATUS: Readonly<{
  ATTEMPTING: "attempting";
  DELIVERED: "delivered";
  FAILED: "failed";
  NOT_ELIGIBLE: "not_eligible";
  NOT_CONFIGURED: "not_configured";
}>;

export type IdentityConfirmationDelivery = {
  channel: "device" | "email" | "none";
  status: "attempting" | "delivered" | "failed" | "not_eligible" | "not_configured";
  attemptedAt?: string;
  deliveredAt?: string;
  playerAlreadyInside?: boolean;
  reason?: string;
  skippedDuplicate?: boolean;
};

export type IdentityConfirmationRequest = {
  id?: string;
  canonicalUsername?: string;
  activationReturnMethod?: "device" | "email" | "discord" | "telegram" | "return_here";
  activationDevice?: { token?: string } | null;
  approvalAlertDevice?: { token?: string } | null;
  approvalAlertEmail?: string;
  approvalAlertEmailConsent?: true;
  preferredContactMethod?: "email" | "discord" | "telegram";
  preferredContactValue?: string;
  betaContactConsent?: true;
  activationDeviceDelivery?: "delivered" | "failed" | "not_eligible";
  accessEmailDelivery?: "delivered" | "failed" | "not_eligible" | "not_configured";
  identityConfirmationDelivery?: IdentityConfirmationDelivery;
  decidedAt?: string;
};

type NonePlan = {
  channel: "none";
  status: "not_eligible";
  reason: string;
};

type DevicePlan = {
  channel: "device";
  fcmToken: string;
  title: string;
  body: string;
  link: string;
  requestId: string;
  canonicalUsername: string;
  reason?: undefined;
};

type EmailPlan = {
  channel: "email";
  email: string;
  subject: string;
  text: string;
  link: string;
  requestId: string;
  canonicalUsername: string;
  reason?: undefined;
};

export function planFoundingBetaIdentityConfirmation(input: {
  request: IdentityConfirmationRequest;
  playerAlreadyInside: boolean;
  siteUrl?: string;
  magicLink?: string;
}): NonePlan | DevicePlan | EmailPlan;

export function priorSuccessfulIdentityConfirmation(request: IdentityConfirmationRequest): IdentityConfirmationDelivery | undefined;

export function executeFoundingBetaIdentityConfirmationDelivery(input: {
  request: IdentityConfirmationRequest;
  playerAlreadyInside: boolean;
  siteUrl?: string;
  magicLink?: string;
  emailConfigured: boolean;
  sendDevice: (plan: DevicePlan) => Promise<boolean>;
  sendEmail: (plan: EmailPlan) => Promise<boolean>;
}): Promise<IdentityConfirmationDelivery>;
