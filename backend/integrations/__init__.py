"""External integration layer (Tier 1-3).

PRAXIS connects to real external services (SMTP, Slack webhooks, Jira, Google
Drive, DocuSign, calendar .ics feeds, Keycloak SSO) with credentials encrypted at
rest and never exposed through any API read endpoint.

Policy (hackathon-honest):
  - Tier 1 (email, chat, calendar, SSO) is fully real.
  - Tier 2 (Jira, Drive, DocuSign) is real but requires the firm's own external
    accounts; if a connection is not configured the card stays "not_connected".
  - Tier 3 (SEBI SCORES) has no public API — it is a manual reference field, not a
    fake sync. LDAP stays on the roadmap.
"""
