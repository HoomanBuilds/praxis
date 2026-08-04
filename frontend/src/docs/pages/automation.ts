import type { DocPage } from "../types";
import { h2, p, ul, ol, table, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "workflow-rules",
    title: "Workflow Rules",
    description:
      "How approved obligations become machine-checkable compliance rules with evaluation criteria.",
    updated: UPDATED,
    sections: [
      p(
        "Every approved obligation is translated into a compliance rule — a structured, machine-checkable statement of what the firm must do. Rules are what make compliance measurable instead of anecdotal.",
      ),
      h2("Rule types",
      ),
      table(
        ["Type", "Example"],
        [
          ["Deadline", "Submit the report within 30 days of year end."],
          ["Threshold", "Client funds must be segregated at a minimum of 1:1."],
          ["Documentation", "Maintain an approved policy on record."],
          ["Periodic filing", "File the compliance report quarterly."],
          ["Process adherence", "Follow the client onboarding process."],
        ],
      ),
      h2("What a rule contains",
      ),
      p(
        "Each rule carries an evaluation criterion, a timeline where relevant, and the threshold value taken verbatim from the source — never invented. Where a requirement is qualitative and cannot be reduced to a number, the rule is marked as requiring human judgement rather than fabricating a threshold.",
      ),
      h2("From obligation to rule",
      ),
      p(
        "Rules are generated only for approved obligations. The rule inherits the obligation's source reference, so it is always traceable back to the regulation.",
      ),
      h2("Evidence linkage",
      ),
      p(
        "Each rule maps to the evidence type that demonstrates it is met. The chain from rule to evidence requirement is how compliance is proven.",
      ),
    ],
  },

  {
    slug: "scheduled-reviews",
    title: "Scheduled Reviews",
    description:
      "Recurring reviews that keep obligations, evidence and risk current without manual chasing.",
    updated: UPDATED,
    sections: [
      p(
        "Compliance is a moving target. Scheduled reviews make sure the platform's picture stays current — obligations re-checked, evidence refreshed, risk re-evaluated.",
      ),
      h2("What can be scheduled"),
      ul([
        "Review cycles for obligations, ensuring the register reflects reality.",
        "Recurring checks that evidence is still on file and current.",
        "Periodic risk re-assessment for high-risk obligations.",
        "Regulatory watch sweeps that look for new instruments.",
      ]),
      h2("How scheduling works",
      ),
      p(
        "Under Settings → Automation, administrators configure review schedules. Scheduled reviews produce notification-driven work items so the right people are reminded at the right time.",
      ),
      h2("Why it matters",
      ),
      p(
        "An obligation approved six months ago may no longer reflect the firm's situation. Scheduled reviews turn compliance from a point-in-time snapshot into a living program.",
      ),
    ],
  },

  {
    slug: "reminders",
    title: "Reminders",
    description:
      "Automatic alerts before deadlines so nothing slips through.",
    updated: UPDATED,
    sections: [
      p(
        "Reminders notify owners and reviewers before deadlines, so tasks and filings are completed on time rather than discovered late.",
      ),
      h2("What triggers a reminder",
      ),
      ul([
        "A task deadline approaching (configurable lead time).",
        "A filing due date approaching.",
        "An obligation left in pending review for too long.",
        "Evidence requirements still missing near a review date.",
      ]),
      h2("Delivery",
      ),
      p(
        "Reminders are delivered through the same channels as notifications: in-platform, by email, or to a connected messaging channel. Each user's preferences apply.",
      ),
      h2("Configuring reminders",
      ),
      p(
        "Lead times and channels are configured under Settings → Automation and Settings → Notifications.",
      ),
    ],
  },

  {
    slug: "escalations",
    title: "Escalations",
    description:
      "Automatic escalation of overdue work through the review chain.",
    updated: UPDATED,
    sections: [
      p(
        "When work stays overdue, it escalates: from owner to reviewer, and from reviewer to management. Escalations are the safety net that keeps deadlines from being missed silently.",
      ),
      h2("The escalation chain",
      ),
      ol([
        "A task or filing passes its deadline.",
        "The owner and reviewer are reminded.",
        "If it remains unresolved, the item escalates to the department manager.",
        "Continued inaction escalates to administration, with the full history visible.",
      ]),
      h2("How it is configured"),
      p(
        "Escalation steps and time thresholds are set under Settings → Automation. Every escalation is recorded in the audit trail, so the history of a late item is fully documented.",
      ),
      h2("Why escalation matters for audit",
      ),
      p(
        "A regulator does not want to hear that a filing was missed with no one accountable. The escalation trail shows exactly who was responsible, who was reminded, and when it was escalated.",
      ),
    ],
  },

  {
    slug: "approval-flows",
    title: "Approval Flows",
    description:
      "The human gates built into the platform: obligation review, task sign-off and board-level approvals.",
    updated: UPDATED,
    sections: [
      p(
        "Approval flows are the human-in-the-loop gates of PRAXIS. Nothing becomes effective until the right person approves it, and every approval is recorded.",
      ),
      h2("Obligation approval",
      ),
      p(
        "Every identified obligation passes through a compliance officer. Approval makes it eligible for rules, tasks and evidence; rejection records why it does not apply. There is no path that bypasses this gate.",
      ),
      h2("Task and evidence sign-off",
      ),
      p(
        "Completed tasks are reviewed by a reviewer before they are marked complete. Evidence is attached by a collector and remains linked to the obligation.",
      ),
      h2("Board-level requirements",
      ),
      p(
        "Obligations that require board-approved documentation create a dependent approval task, so the formal sign-off is part of the workflow rather than an afterthought.",
      ),
      h2("The record",
      ),
      p(
        "Every approval carries the reviewer, a timestamp and, where applicable, a note. The chain of approvals is part of the audit package for any obligation.",
      ),
    ],
  },
];
