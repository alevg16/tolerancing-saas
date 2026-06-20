/** Database row shapes (mirror supabase/migrations/0001_init.sql). */

export type Role = "owner" | "admin" | "member";
export type Plan = "free" | "pro" | "team" | "business";
export type SubscriptionStatus = "active" | "past_due" | "canceled";

/** Known calculator modules. `data` is JSONB, so adding one needs no migration. */
export type ModuleType =
  | "hole_shaft_fit"
  | "thread_fit"
  | "bolt_torque"
  | "linear_stack"
  | "tolerance_allocation"
  | "press_fit"
  | "true_position";

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
}

export interface Membership {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  created_by: string | null;
  name: string;
  module_type: ModuleType;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface LibraryItem {
  id: string;
  organization_id: string;
  type: string;
  name: string;
  data: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  organization_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: Plan;
  status: SubscriptionStatus;
  seats: number;
  current_period_end: string | null;
  updated_at: string;
}
