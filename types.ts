
export type Page = 'Dashboard' | 'Tenants' | 'AddTenant' | 'Subscriptions' | 'Reports' | 'Communication' | 'Settings' | 'PaymentGateways';

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
  created_at: string;
  updated_at?: string;
  // Legacy fields for compatibility (derived from subscriptions)
  currentPlan?: string;
  status?: TenantStatus;
  startDate?: string;
  endDate?: string;
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
    storage: number; // In GB
    features: string; // English description / features list
    featuresAr?: string; // Arabic description / features list
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

export type BroadcastTarget = 'all' | `plan_${number}`;
export type BroadcastStatus = 'sent' | 'scheduled' | 'draft';

export interface Broadcast {
    id: number;
    subject: string;
    content: string;
    target: BroadcastTarget;
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
  };
}