
export type Page = 'Dashboard' | 'Tenants' | 'AddTenant' | 'TenantWhatsApp' | 'Subscriptions' | 'Reports' | 'Communication' | 'Settings' | 'PaymentGateways' | 'SupportTickets';

export type TicketStatus = 'open' | 'in_progress' | 'closed';

export interface SupportTicket {
  id: number;
  title: string;
  description: string;
  status: TicketStatus;
  company_name?: string;
  created_by_username?: string;
  created_at: string;
  updated_at: string;
}

export enum TenantStatus {
  Active = 'Active',
  Trial = 'Trial',
  Expired = 'Expired',
  Deactivated = 'Deactivated'
}

export interface Tenant {
  id: number;
  name: string;
  domain: string;
  specialization: string;
  owner: number;
  owner_username?: string;
  owner_email?: string;
  owner_phone?: string;
  created_at: string;
  updated_at?: string;
  // Legacy fields for compatibility (derived from subscriptions)
  currentPlan?: string;
  status?: TenantStatus;
  startDate?: string;
  endDate?: string;
  /** API: company.free_trial_consumed — whether the tenant may no longer start a system free trial */
  freeTrialConsumed?: boolean;
}

export interface Plan {
    id: number;
    name: string;
    nameAr?: string;
    type: 'Trial' | 'Paid' | 'Free';
    priceMonthly: number;
    priceYearly: number;
    trialDays: number;
    users: number | 'unlimited';
    clients: number | 'unlimited';
    features: string; // English description / features list
    featuresAr?: string; // Arabic description / features list
    /**
     * Entitlements (new in backend Plan model):
     * - plan.features (JSON) => feature flags
     * - plan.limits (JSON) => extra quotas beyond users/clients
     * - plan.usage_limits_monthly (JSON) => monthly usage caps
     *
     * We keep these separate to avoid colliding with the legacy `features` string above
     * (which maps to API `description`).
     */
    entitlementsFeatures?: Record<string, boolean>;
    entitlementsLimits?: Record<string, number | 'unlimited' | null>;
    entitlementsUsageLimitsMonthly?: Record<string, number | 'unlimited' | null>;
    /** Higher = higher tier; used for upgrade/downgrade rules on the API. */
    tier?: number;
    visible: boolean;
}

export enum PaymentStatus {
    Successful = 'Successful',
    Failed = 'Failed',
    Pending = 'Pending',
    Canceled = 'Canceled'
}

export interface Payment {
    id: string;
    companyName: string;
    amount: number;
    /** When API sends `amount_usd`, used for display; otherwise fall back to `amount`. */
    amountUsd?: number | null;
    currency?: string;
    plan: string;
    status: PaymentStatus;
    date: string;
}

export enum InvoiceStatus {
    Paid = 'Paid',
    Due = 'Due',
    Overdue = 'Overdue'
}

export interface Invoice {
    id: string;
    companyName: string;
    amount: number;
    dueDate: string;
    status: InvoiceStatus;
}

export type BroadcastTarget =
    | 'all'
    | `plan_${number}`
    | 'role_admin'
    | 'role_supervisor'
    | 'role_employee'
    | `company_${number}`;
export type BroadcastStatus = 'sent' | 'scheduled' | 'pending' | 'failed' | 'draft';
export type BroadcastType = 'email' | 'push';

export interface Broadcast {
    id: number;
    subject: string;
    content: string;
    target: BroadcastTarget;
    /** When non-empty, broadcast is sent to the union of all listed targets. */
    targets?: string[];
    broadcast_type: BroadcastType;
    status: BroadcastStatus;
    createdAt: string;
    scheduledAt?: string | null;
    sentAt?: string | null;
}

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: string;
}

export interface LimitedAdmin {
    id: number;
    user: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
    };
    is_active: boolean;
    created_by?: number;
    created_by_username?: string;
    created_at: string;
    updated_at: string;
    can_view_dashboard: boolean;
    can_manage_tenants: boolean;
    can_manage_subscriptions: boolean;
    can_manage_payment_gateways: boolean;
    can_view_reports: boolean;
    can_manage_communication: boolean;
    can_manage_settings: boolean;
    can_manage_limited_admins: boolean;
}

export interface AuditLog {
    id: number;
    user: string;
    action: { key: string; params: Record<string, string | number> };
    timestamp: string;
}

export type BackupStatus = 'in_progress' | 'completed' | 'failed';
export type BackupInitiator = 'manual' | 'scheduled';

export interface SystemBackup {
    id: string;
    status: BackupStatus;
    initiator: BackupInitiator;
    file?: string | null;
    file_size: number;
    created_by?: number | null;
    created_by_email?: string | null;
    notes?: string;
    error_message?: string;
    metadata?: Record<string, any>;
    created_at: string;
    completed_at?: string | null;
    download_url?: string | null;
}

export enum PaymentGatewayStatus {
  Active = 'Active',
  Disabled = 'Disabled',
  SetupRequired = 'SetupRequired'
}

export interface PaymentGateway {
  id: string;
  name: string;
  description: string;
  status: PaymentGatewayStatus;
  enabled: boolean;
  config: {
    // Generic fields (for Stripe, etc.)
    publishableKey?: string;
    secretKey?: string;
    environment?: 'test' | 'live';
    // Paytabs specific fields
    profileId?: string;
    serverKey?: string;
    clientKey?: string;
    // Zain Cash specific fields
    merchantId?: string;
    merchantSecret?: string;
    msisdn?: string;
    // Qi Card
    terminalId?: string;
    username?: string;
    password?: string;
    // FIB (First Iraqi Bank) OAuth-style credentials
    clientId?: string;
    clientSecret?: string;
  };
}