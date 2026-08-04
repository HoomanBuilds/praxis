import type { DocPage } from "../types";
import { h2, p, ul, table, note, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "authentication-security",
    title: "Authentication",
    description:
      "How identity is verified in PRAXIS — secure passwords, SSO, LDAP and session management.",
    updated: UPDATED,
    sections: [
      p(
        "Authentication is how PRAXIS verifies that someone is who they say they are. Every sign-in path is protected, and credentials are stored and handled securely.",
      ),
      h2("Sign-in methods",
      ),
      table(
        ["Method", "Used for", "Security posture"],
        [
          ["Email + password", "Local accounts", "Passwords stored as secure hashes; never plain text."],
          ["SSO (OpenID Connect)", "Corporate identity", "Delegates verification to your identity provider."],
          ["LDAP", "Directory-backed identity", "Validates against your directory service."],
        ],
      ),
      h2("Password security",
      ),
      ul([
        "Passwords are hashed with a strong, salted algorithm before storage.",
        "Password policies apply at account creation and reset.",
        "There is no mechanism that recovers a plaintext password.",
      ]),
      h2("SSO",
      ),
      p(
        "PRAXIS supports OpenID Connect, so you can connect Keycloak, Microsoft Entra ID, Google or any OIDC provider. Users sign in once with their corporate credentials; session tokens are issued by PRAXIS afterwards.",
      ),
      h2("LDAP",
      ),
      p(
        "For directory-aware deployments, PRAXIS validates credentials against an LDAP directory. Configuration covers the server, bind credentials and the user search base.",
      ),
      h2("Sessions",
      ),
      p(
        "Interactive sessions use short-lived tokens. Sessions end on sign-out or expiry, and an administrator can revoke access by deactivating a user. Audit logs record successful and failed sign-in events.",
      ),
      note(
        "Credentials never leave the boundary",
        "Passwords, API keys and integration credentials are stored encrypted and are never exposed to the interface.",
      ),
    ],
  },

  {
    slug: "access-control",
    title: "Access Control",
    description:
      "Role-based access across every screen and API, with administrator-only configuration.",
    updated: UPDATED,
    sections: [
      p(
        "Access control decides what each user can see and do. PRAXIS uses role-based access control enforced consistently in the interface and the API.",
      ),
      h2("Roles",
      ),
      table(
        ["Role", "Access"],
        [
          ["Administrator", "Everything — users, settings, integrations, security, all records."],
          ["Compliance officer", "Review and decision rights on obligations, evidence and filings."],
          ["Owner / reviewer", "Assigned tasks and team output."],
          ["Analyst", "Read access to records and analytics, report generation."],
          ["Auditor", "Read-only access including the full audit trail."],
        ],
      ),
      h2("Enforcement",
      ),
      p(
        "Permissions are checked at the API layer. Hiding a button in the interface is not enough — a user without the role cannot perform the action through the API either.",
      ),
      h2("Administrator controls",
      ),
      ul([
        "User accounts and role assignment.",
        "Integration configuration and API keys.",
        "Organization settings and departments.",
        "Data retention and security settings.",
      ]),
      h2("Least privilege",
      ),
      p(
        "Assign the least privilege each person needs. Analysts and auditors get read access; only the people who decide get review rights; only administrators configure the platform.",
      ),
    ],
  },

  {
    slug: "encryption",
    title: "Encryption",
    description:
      "Data at rest, in transit, and the secrets store.",
    updated: UPDATED,
    sections: [
      p(
        "Encryption protects compliance data at rest and in transit, and keeps secrets out of plaintext storage.",
      ),
      h2("In transit",
      ),
      p(
        "All traffic between users and PRAXIS runs over TLS in production. Deployments terminate TLS at the load balancer or web server; the API does not accept plaintext HTTP in production configuration.",
      ),
      h2("At rest",
      ),
      p(
        "The database, document store and queue volumes can be encrypted at the storage layer (for example with encrypted disks or cloud storage encryption). Database-level and file-level encryption is your deployment's decision, aligned with your firm's storage policy.",
      ),
      h2("Secrets",
      ),
      p(
        "Integration credentials and API keys are encrypted before storage. The encryption key is managed by the deployment and is never exposed through the interface. A secret is shown only once, at creation.",
      ),
      h2("Document security",
      ),
      p(
        "Uploaded regulatory documents and evidence artefacts are stored as files in your storage layer and served to authorized users only, over the authenticated session.",
      ),
      h2("The analysis engine boundary",
      ),
      p(
        "Document analysis runs inside your deployment boundary. Regulatory content is processed locally and does not travel to any external service.",
      ),
    ],
  },

  {
    slug: "audit-trail",
    title: "Audit Trail",
    description:
      "The append-only record that makes every decision traceable and regulator-ready.",
    updated: UPDATED,
    sections: [
      p(
        "The audit trail is the backbone of PRAXIS trustworthiness. It is an append-only log: every action is recorded, and nothing in it is edited or deleted.",
      ),
      h2("What is recorded",
      ),
      ul([
        "Who — the person or the platform performing the action.",
        "What — the action, including before and after values for edits.",
        "Which record — the document, obligation, task or evidence affected.",
        "When — a timestamp for every entry.",
      ]),
      h2("Why append-only",
      ),
      p(
        "A log that cannot be rewritten is a log a regulator can rely on. Every obligation traces to a verbatim source paragraph, and every decision to a named reviewer with a timestamp.",
      ),
      h2("Searching",
      ),
      p(
        "Search the audit trail by action, person or record, and filter to follow one obligation's full history from identification to implementation.",
      ),
      h2("Regulator-ready export",
      ),
      p(
        "Generate an audit package for one obligation, one document, or the whole firm, exported as PDF and XLSX. The package presents the traceable chain from source regulatory text to implementation evidence, plus a system attestation.",
      ),
      h2("Access",
      ),
      p(
        "The full audit trail is visible to auditors and administrators. Everyone can see the actions they are entitled to see, in the activity feed.",
      ),
    ],
  },

  {
    slug: "compliance-standards",
    title: "Compliance Standards",
    description:
      "How PRAXIS supports the standards and expectations of regulated firms.",
    updated: UPDATED,
    sections: [
      p(
        "This page describes the security and audit posture PRAXIS provides to support your firm's obligations under regulatory frameworks.",
      ),
      h2("What PRAXIS provides",
      ),
      ul([
        "An append-only audit trail suitable for regulatory review.",
        "Role-based access control and SSO for identity management.",
        "Encrypted secret storage and transport security.",
        "Data retention controls aligned with record-keeping requirements.",
        "Verbatim source references on every obligation.",
      ]),
      h2("Supporting your obligations",
      ),
      p(
        "PRAXIS is a tool for meeting obligations, not a certification. Your firm remains responsible for its regulatory obligations; PRAXIS provides the records, controls and evidence trail that support them.",
      ),
      h2("Data retention",
      ),
      p(
        "Configure retention periods in Settings → Data Retention to match your regulatory requirements — commonly five years for market-intermediary records. Audit and evidence data should be backed up and retained accordingly.",
      ),
      h2("Independent audit",
      ),
      p(
        "The audit package export is designed to be handed to internal audit and regulators: dated, traceable from regulatory text to evidence, and with a system attestation.",
      ),
      note(
        "Not legal advice",
        "Documentation and features do not constitute legal advice. Configure PRAXIS in line with your firm's compliance policies and legal guidance.",
      ),
    ],
  },
];
