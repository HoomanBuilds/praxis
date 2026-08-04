import type { DocPage } from "../types";
import { h2, p, ul, ol, table, note, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "users-and-roles",
    title: "Users & Roles",
    description:
      "Creating accounts, assigning roles, and managing who can see and do what in PRAXIS.",
    updated: UPDATED,
    sections: [
      p(
        "Users are the people who work in PRAXIS. Every person who reviews obligations, completes tasks, gathers evidence or runs reports needs an account with an appropriate role.",
      ),
      h2("Creating users",
      ),
      ol([
        "Open Settings → Users.",
        "Add a user with their name and work email.",
        "Assign a role and, optionally, a department.",
        "The user signs in with the email and a password, or through SSO if configured.",
      ]),
      h2("Roles",
      ),
      table(
        ["Role", "Typical responsibilities"],
        [
          ["Administrator", "Full access — users, settings, integrations, security, all records."],
          ["Compliance officer", "Reviewing and approving obligations, managing evidence and filings."],
          ["Owner / reviewer", "Completing assigned tasks, reviewing team output."],
          ["Analyst", "Viewing records and analytics, running reports."],
          ["Auditor", "Read-only access to the audit trail and exports."],
        ],
      ),
      h2("Sign-in methods",
      ),
      ul([
        "Email and password managed by PRAXIS.",
        "SSO through your corporate identity provider (Keycloak or LDAP).",
        "API access uses scoped API keys rather than user credentials.",
      ]),
      h2("Deactivating users",
      ),
      p(
        "Deactivate rather than delete where possible, to preserve the audit trail of past actions. Deactivated users keep their history but cannot sign in.",
      ),
    ],
  },

  {
    slug: "teams",
    title: "Teams",
    description:
      "Grouping users by department so tasks, evidence and reports flow to the right people.",
    updated: UPDATED,
    sections: [
      p(
        "Teams group users by the functional areas of your organization. When an obligation is approved for a department, the tasks and evidence route to that team.",
      ),
      h2("Teams in PRAXIS"),
      p(
        "Departments are the teams of your firm. Each has a primary owner and a reviewer, configured under Settings → Departments. Users belong to departments, and tasks assign to the department's owner.",
      ),
      h2("Why teams matter",
      ),
      ul([
        "Tasks land with the right owner and reviewer.",
        "Escalations have a clear route.",
        "Filters and reports work by department.",
        "Evidence collectors are assigned from the department.",
      ]),
      h2("Setting up teams",
      ),
      ol([
        "Define the departments your firm actually has.",
        "Assign a primary owner and reviewer to each.",
        "Place users in their departments.",
        "Assign tasks that route to the department.",
      ]),
    ],
  },

  {
    slug: "permissions",
    title: "Permissions",
    description:
      "What each role can see and do, and how access is enforced across the platform.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS uses role-based access control. A user's role determines what they can see and what actions they can take, and the permissions are enforced on every screen and API call.",
      ),
      h2("Permission model",
      ),
      ul([
        "Administrators: full access, including users, settings, integrations and security.",
        "Compliance officers: review and decision rights on obligations, evidence and filings.",
        "Owners and reviewers: act on assigned tasks and review team output.",
        "Analysts and auditors: read access; auditors additionally see the full audit trail and exports.",
      ]),
      h2("What is protected",
      ),
      table(
        ["Area", "Who can act"],
        [
          ["Obligation review", "Compliance officers and administrators."],
          ["Task completion", "Assigned owners and their reviewers."],
          ["Evidence upload", "Collectors and administrators."],
          ["Settings & integrations", "Administrators only."],
          ["Audit trail", "Everyone can see their own actions; full log for auditors and administrators."],
        ],
      ),
      h2("Enforcement",
      ),
      p(
        "Permissions are checked at the API level, not just hidden in the interface. A user cannot take an action they are not authorized for, even by calling the API directly.",
      ),
    ],
  },

  {
    slug: "notifications",
    title: "Notifications",
    description:
      "Alerts for reviews, deadlines, filings and events that need your attention.",
    updated: UPDATED,
    sections: [
      p(
        "Notifications keep people informed of what needs their attention: items awaiting review, tasks approaching or past deadline, filing due dates and completed processing.",
      ),
      h2("What generates a notification",
      ),
      ul([
        "A document finishes processing and obligations await review.",
        "A task is assigned to you or approaches its deadline.",
        "A filing becomes due or overdue.",
        "An obligation you reviewed is acted on.",
        "System events such as processing failures.",
      ]),
      h2("Notification settings",
      ),
      p(
        "Under Settings → Notifications you can choose which events produce notifications and how they are delivered — in-platform, by email, or to a connected messaging channel.",
      ),
      h2("Reading notifications",
      ),
      p(
        "The bell icon in the header shows unread notifications. Open the notifications screen to see the full list, filter by type, and mark items read. Unread counts are tracked per user.",
      ),
    ],
  },

  {
    slug: "settings",
    title: "Settings",
    description:
      "Organization, departments, users, roles, integrations, notifications, security, automation and data retention.",
    updated: UPDATED,
    sections: [
      p(
        "Settings is the control center for administrators. Everything about how your organization runs in PRAXIS is configured here.",
      ),
      h2("Organization",
      ),
      p("Firm name, firm type and intermediary classes. These shape how regulations apply to your firm."),
      h2("Departments",
      ),
      p("Functional areas, their primary owners, reviewers and how obligations route to them."),
      h2("Users and roles",
      ),
      p("Accounts, roles, departments and sign-in methods for the people who work in PRAXIS."),
      h2("Integrations",
      ),
      p("Connect email, calendar, messaging, document and identity services. Each integration card shows its connection status and last test."),
      h2("Notifications",
      ),
      p("Which events alert people, and by which channel."),
      h2("Security",
      ),
      p("SSO configuration, authentication settings, API keys and access controls."),
      h2("Automation",
      ),
      p("How much of the pipeline runs automatically, review scheduling and escalation behavior."),
      h2("Data retention",
      ),
      p("How long records are kept, and retention periods aligned with regulatory requirements."),
      note(
        "Administrator only",
        "Settings is restricted to administrators. Officers and analysts see the operational screens, not configuration.",
      ),
    ],
  },

  {
    slug: "audit-logs",
    title: "Audit Logs",
    description:
      "A permanent, unalterable record of every action taken in PRAXIS.",
    updated: UPDATED,
    sections: [
      p(
        "The Audit Trail is an append-only record of every action in the platform: documents uploaded, obligations identified and reviewed, tasks completed, evidence attached. Nothing is edited or deleted — only appended.",
      ),
      h2("What is recorded",
      ),
      ul([
        "Who performed the action — a person or the platform itself.",
        "What was done, including before and after values for edits.",
        "The record affected — the document, obligation, task or evidence.",
        "When it happened, with a timestamp.",
      ]),
      h2("Using the log",
      ),
      p(
        "Search the log by action, person or record. Filter to follow the complete history of one obligation from identification to implementation.",
      ),
      h2("Why append-only",
      ),
      p(
        "An audit log that cannot be edited is one a regulator can trust. Every decision traces to a named reviewer with a timestamp, and every obligation traces to a verbatim source paragraph.",
      ),
      h2("Regulator-ready export",
      ),
      p(
        "Generate an audit package for one obligation, one document, or the whole firm, exported as PDF and XLSX. The export is the regulator-ready record of your compliance program.",
      ),
      h2("Storage",
      ),
      p(
        "Audit records are retained according to your data retention settings. Treat them as evidence records — plan backups and retention accordingly.",
      ),
    ],
  },
];
