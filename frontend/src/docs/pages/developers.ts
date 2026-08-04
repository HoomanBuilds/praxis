import type { DocPage } from "../types";
import { h2, p, ul, code, table, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "rest-api",
    title: "REST API",
    description:
      "The programmatic interface to PRAXIS — documents, obligations, tasks, evidence, the graph and audit exports.",
    updated: UPDATED,
    sections: [
      p(
        "Every screen in PRAXIS is backed by a REST API. The same API is available to integrators and tooling, with the same permissions enforced as in the interface.",
      ),
      h2("Base URL",
      ),
      code("https://<your-praxis-host>/api", "text"),
      h2("Authentication",
      ),
      p(
        "Authenticate with a bearer token or a scoped API key. See the Authentication page for details.",
      ),
      h2("Core resources",
      ),
      table(
        ["Resource", "Key operations"],
        [
          ["Documents", "Ingest, list, get, process, generate rules."],
          ["Obligations", "List, get, approve, reject, edit."],
          ["Rules / Tasks / Evidence", "List by obligation."],
          ["Dashboard", "Compliance summary and counts."],
          ["Activity", "The live audit feed."],
          ["Knowledge graph", "Nodes, edges and GraphML export."],
          ["Audit", "Generate and download audit packages."],
        ],
      ),
      h2("Example — ingest a circular",
      ),
      code(
        "curl -X POST \"https://<host>/api/documents/ingest?process=true\" \\\n  -H \"Authorization: Bearer <token>\" \\\n  -F \"file=@master-circular.pdf\" \\\n  -F \"reference=SEBI/HO/...\" -F \"title=Master Circular\"",
        "bash",
      ),
      h2("Example — review an obligation",
      ),
      code(
        "curl \"https://<host>/api/obligations?status=pending_review\" \\\n  -H \"Authorization: Bearer <token>\"\n\ncurl -X POST \"https://<host>/api/obligations/{id}/approve\" \\\n  -H \"Authorization: Bearer <token>\" \\\n  -H \"Content-Type: application/json\" \\\n  -d '{\"reviewer\":\"officer@example.com\",\"note\":\"Applies to us\"}'",
        "bash",
      ),
      h2("Error handling",
      ),
      p(
        "The API returns standard HTTP status codes with a JSON detail message. See Error Codes in the Reference for the full list.",
      ),
      h2("Documentation",
      ),
      p(
        "The OpenAPI schema is served by the API and describes every endpoint, parameter and schema. Use it to generate clients for your language.",
      ),
    ],
  },

  {
    slug: "webhooks",
    title: "Webhooks",
    description:
      "Outbound webhook delivery of PRAXIS events to your own systems.",
    updated: UPDATED,
    sections: [
      p(
        "Webhooks let PRAXIS push events to your systems instead of waiting for a poll. When something happens — an obligation awaits review, a filing becomes due, a document finishes processing — PRAXIS delivers a signed HTTP POST to your endpoint.",
      ),
      h2("Supported events",
      ),
      ul([
        "document.processed — a document finished processing.",
        "obligation.awaiting_review — new obligations identified.",
        "obligation.approved / rejected — review decisions.",
        "task.completed — implementation events.",
        "filing.due / filing.overdue — filing lifecycle.",
      ]),
      h2("Delivery"),
      p(
        "Webhook endpoints are registered under Settings → Integrations. PRAXIS posts JSON payloads and expects a 2xx response; failed deliveries are retried.",
      ),
      h2("Security",
      ),
      p(
        "Payloads can be verified with the shared secret for your integration, so your systems can confirm a delivery really came from PRAXIS.",
      ),
      h2("Receiving channels",
      ),
      p(
        "The same webhook mechanism powers the messaging integrations (Slack, Teams) — those are just webhook receivers PRAXIS already knows.",
      ),
    ],
  },

  {
    slug: "sdk",
    title: "SDK",
    description:
      "Consuming the PRAXIS API from your own applications.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS does not ship a compiled SDK. The REST API is the integration surface, and it is fully described by an OpenAPI schema, so you can generate a typed client for any language.",
      ),
      h2("Generating a client",
      ),
      ul([
        "Fetch the OpenAPI schema from the API server.",
        "Generate a client with your language's OpenAPI tooling (for example openapi-generator).",
        "Authenticate with an API key scoped to the resources you need.",
      ]),
      h2("Recommended usage",
      ),
      ul([
        "Ingest documents programmatically and subscribe to processing events.",
        "Pull obligations, tasks and evidence into internal dashboards.",
        "Trigger audit package generation and download exports.",
        "Mirror compliance data into a data warehouse for reporting.",
      ]),
      h2("Best practices",
      ),
      ul([
        "Use API keys scoped to the smallest privilege you need.",
        "Poll with reasonable intervals, or prefer webhooks for event-driven work.",
        "Keep regulatory payloads inside your network boundary.",
      ]),
    ],
  },

  {
    slug: "authentication",
    title: "Authentication",
    description:
      "How users and programs authenticate to PRAXIS — sessions, SSO and API keys.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS supports two audiences with different credentials: people sign in through the interface, and programs authenticate with API keys.",
      ),
      h2("People — interactive sign-in",
      ),
      ul([
        "Email and password accounts managed by PRAXIS.",
        "SSO through your identity provider using OpenID Connect (for example Keycloak, Microsoft Entra ID, Google).",
        "LDAP-backed identity for directory-aware deployments.",
      ]),
      h2("Programs — API keys",
      ),
      p(
        "Integrations and scripts use API keys issued from Settings → API Keys. Each key is scoped to the resources it can access and can be revoked at any time.",
      ),
      h2("Sessions",
      ),
      p(
        "Interactive sign-in issues a short-lived session token. API keys are long-lived credentials with scope and should be stored securely — treat them like passwords.",
      ),
      h2("Where credentials never go",
      ),
      ul([
        "Passwords are stored as secure hashes, never in plain text.",
        "API keys are shown once at creation and stored encrypted.",
        "Integration credentials are encrypted at rest in the platform's store.",
      ]),
    ],
  },
];
