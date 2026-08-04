import type { DocPage } from "../types";
import { h2, p, ul, ol, table, note, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "microsoft-365",
    title: "Microsoft 365",
    description:
      "Connect your Microsoft 365 identity, email and calendar so PRAXIS works alongside your existing tools.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS can be connected to Microsoft 365 so users sign in with their corporate identity, notifications arrive by corporate email, and deadlines appear in Outlook calendars.",
      ),
      h2("What you can connect",
      ),
      ul([
        "SSO via Microsoft Entra ID (Azure AD) through the platform's OpenID Connect support.",
        "Email delivery through your corporate SMTP for notifications and reminders.",
        "Calendar subscriptions so task and filing deadlines appear in Outlook.",
      ]),
      h2("Connecting",
      ),
      ol([
        "Open Settings → Integrations.",
        "Configure the identity provider with your Entra ID tenant details.",
        "Configure SMTP with your organization's mail server.",
        "Subscribe to the PRAXIS calendar feed from Outlook.",
        "Run the connection test on each card to confirm the live connection.",
      ]),
      h2("Verification",
      ),
      p(
        "Each integration card shows its connection status and the last time it was tested. PRAXIS performs a live connection test when you save, so the badge always reflects reality.",
      ),
    ],
  },

  {
    slug: "google-workspace",
    title: "Google Workspace",
    description:
      "Google sign-in, Drive evidence storage and Calendar sync for teams on Workspace.",
    updated: UPDATED,
    sections: [
      p(
        "Teams on Google Workspace can connect PRAXIS to their Google identity, use Drive for evidence storage, and see deadlines in Google Calendar.",
      ),
      h2("What you can connect",
      ),
      ul([
        "SSO through Google as your identity provider.",
        "Google Drive as an evidence store for attached artefacts.",
        "Calendar subscriptions so deadlines appear in Google Calendar.",
      ]),
      h2("Connecting Drive for evidence",
      ),
      p(
        "Configure the Google integration with the service account and folder for evidence. Uploaded evidence artefacts can be stored to Drive, keeping your compliance proof in your own cloud.",
      ),
      h2("Verification",
      ),
      p(
        "Connection cards in Settings test the live connection when saved. A card shows Connected only when the test succeeds.",
      ),
    ],
  },

  {
    slug: "email",
    title: "Email",
    description:
      "SMTP-based email delivery for notifications, reminders and compliance reports.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS sends email through your organization's SMTP server. Email is used for notifications, reminders and report delivery, and always comes from an address you control.",
      ),
      h2("Configuration",
      ),
      table(
        ["Setting", "Description"],
        [
          ["SMTP host", "Your mail server hostname."],
          ["Port", "Typically 587 for TLS or 465 for SSL."],
          ["Username / password", "Credentials for the sending mailbox (app passwords supported)."],
          ["From address", "The address email appears to come from."],
        ],
      ),
      h2("What email is used for",
      ),
      ul([
        "Notifications about items awaiting review.",
        "Reminders for approaching deadlines and filings.",
        "Scheduled reports and audit package delivery.",
      ]),
      h2("Testing",
      ),
      p(
        "Save and test the connection to send a test message. Only a successful send marks the integration as connected.",
      ),
      note(
        "Not a sending relay",
        "PRAXIS sends through your existing mail infrastructure; it does not operate its own outbound mail service.",
      ),
    ],
  },

  {
    slug: "slack",
    title: "Slack",
    description:
      "Post compliance notifications to Slack channels so the team sees alerts where they already work.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS can post notifications to Slack through an incoming webhook, bringing compliance alerts into the team's existing channel.",
      ),
      h2("Configuration",
      ),
      ol([
        "Create an incoming webhook for the channel in Slack.",
        "Paste the webhook URL into the Slack integration in Settings → Integrations.",
        "Choose which notification types are posted to Slack.",
        "Test the connection — PRAXIS sends a test message to confirm.",
      ]),
      h2("What is posted",
      ),
      ul([
        "Obligations awaiting review.",
        "Task and filing reminders.",
        "Escalation notices.",
        "Processing completions.",
      ]),
      h2("Permissions"),
      p(
        "Slack posts are outbound only. PRAXIS does not read or index your Slack messages.",
      ),
    ],
  },

  {
    slug: "teams",
    title: "Teams",
    description:
      "Compliance notifications in Microsoft Teams channels via webhook.",
    updated: UPDATED,
    sections: [
      p(
        "For teams that work in Microsoft Teams, PRAXIS posts compliance notifications into a Teams channel through a webhook.",
      ),
      h2("Configuration",
      ),
      ol([
        "Create an incoming webhook for the channel in Microsoft Teams.",
        "Add the webhook URL to the Teams integration in Settings → Integrations.",
        "Choose which notification types are posted.",
        "Test the connection to confirm delivery.",
      ]),
      h2("What is posted",
      ),
      ul([
        "Obligations awaiting review.",
        "Deadline reminders and escalations.",
        "Processing and filing events.",
      ]),
      h2("Permissions",
      ),
      p(
        "Posts are outbound only; PRAXIS does not read Teams conversations.",
      ),
    ],
  },
];
