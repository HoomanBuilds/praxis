export const AREAS = ["all", "operations", "technology", "compliance", "legal", "finance", "client_services", "human_resources"] as const;

export const TASK_STATUSES = ["not_started", "in_progress", "completed", "overdue"] as const;

export const OBLIGATION_STATUSES = ["all", "pending_review", "approved", "edited", "rejected"] as const;

export const RISK_LEVELS = ["critical", "high", "medium", "low", "minimal"] as const;

export const FILING_STATUSES = ["not_filed", "submitted", "acknowledged", "rejected"] as const;

export const INTERMEDIARY_CLASSES = [
  "stockbroker",
  "depository_participant",
  "investment_adviser",
  "portfolio_manager",
  "mutual_fund",
  "merchant_banker",
  "all_intermediaries",
] as const;
