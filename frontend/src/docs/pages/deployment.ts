import type { DocPage } from "../types";
import { h2, p, ul, ol, code, table, note, UPDATED } from "../blocks";

export const pages: DocPage[] = [
  {
    slug: "cloud",
    title: "Cloud",
    description:
      "Running PRAXIS on cloud infrastructure, with your own data boundary.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS is self-hostable on any cloud provider — AWS, Azure, GCP or a private cloud. The reference deployment runs the same containers anywhere, and the data boundary is always yours.",
      ),
      h2("Why self-hosted",
      ),
      p(
        "Regulatory content never leaves your boundary. The analytical review engine runs inside your environment, and all compliance records stay in your database and storage.",
      ),
      h2("A typical cloud layout",
      ),
      ul([
        "An application server running the API and frontend.",
        "PostgreSQL for the system of record.",
        "Redis for the processing queue.",
        "A worker fleet for background processing.",
        "Object storage for documents and evidence.",
        "The analysis engine running on compute dedicated to it.",
      ]),
      h2("Networking",
      ),
      p(
        "Expose the frontend and API over HTTPS. Keep the database, queue and analysis engine on private networks. Integrations such as SSO and email connect outbound.",
      ),
      h2("Getting started"),
      ol([
        "Provision compute and storage in your chosen region.",
        "Deploy using Docker or Kubernetes (see the respective pages).",
        "Configure TLS, DNS and the identity provider.",
        "Run the health check and upload a test document.",
      ]),
    ],
  },

  {
    slug: "self-hosted",
    title: "Self Hosted",
    description:
      "Run PRAXIS on your own hardware or VMs, fully within your control.",
    updated: UPDATED,
    sections: [
      p(
        "Self-hosting gives you full control over data, updates and the analysis engine. PRAXIS runs on standard Linux, macOS or Windows (WSL2) hosts.",
      ),
      h2("What you run"),
      ul([
        "The API server (FastAPI) on port 8080.",
        "The frontend static build served by your web server or bundled container.",
        "PostgreSQL and Redis.",
        "Background workers for processing.",
        "The local analysis engine for document review.",
      ]),
      h2("Requirements",
      ),
      p(
        "See System Requirements for sizing. A single VM with 16 GB RAM handles a typical firm; add workers and memory as the corpus grows.",
      ),
      h2("Installation steps",
      ),
      code(
        "git clone https://github.com/your-org/praxis.git\ncd praxis\ncp .env.example .env   # set secrets and URLs\nmake up                 # or docker compose up -d",
        "bash",
      ),
      h2("Operate",
      ),
      ul([
        "Monitor the health endpoint and worker logs.",
        "Apply updates by pulling the latest images and restarting.",
        "Back up the database and object storage regularly.",
      ]),
      h2("Upgrades",
      ),
      p(
        "PRAXIS upgrades are image replacements. Back up before upgrading, then restart the stack. The database schema migrates automatically on startup.",
      ),
    ],
  },

  {
    slug: "docker",
    title: "Docker",
    description:
      "The reference Docker Compose deployment — every service, volumes and configuration.",
    updated: UPDATED,
    sections: [
      p(
        "PRAXIS ships with a Docker Compose stack that runs the full platform: API, frontend, database, queue, identity provider and the analysis engine.",
      ),
      h2("Services",
      ),
      table(
        ["Service", "Role"],
        [
          ["api", "The REST API (FastAPI)."],
          ["frontend", "The React operator console."],
          ["postgres", "The system-of-record database."],
          ["redis", "The processing queue."],
          ["worker", "Background processing of documents."],
          ["keycloak", "Identity provider for SSO (optional)."],
          ["openldap", "Directory for LDAP-backed identity (optional)."],
        ],
      ),
      h2("Starting the stack",
      ),
      code(
        "cd praxis\ndocker compose up -d",
        "bash",
      ),
      p(
        "The first run pulls images, provisions the database and starts services with health checks. Compose waits for dependent services before starting the API.",
      ),
      h2("Configuration",
      ),
      p(
        "Environment variables come from .env (see .env.example). Settings cover database URLs, queue connection, secrets, the analysis engine endpoint and the frontend URL used for SSO redirects.",
      ),
      h2("Volumes",
      ),
      p(
        "Data lives in named volumes for the database, queue, and identity provider — never in the containers. This is what makes upgrades and backups safe.",
      ),
      h2("Health checks",
      ),
      p(
        "Every service defines a health check, and the API refuses to start until its dependencies are ready. Monitor the health endpoint for the overall system status.",
      ),
    ],
  },

  {
    slug: "kubernetes",
    title: "Kubernetes",
    description:
      "Running PRAXIS on Kubernetes with standard workloads, services and persistent volumes.",
    updated: UPDATED,
    sections: [
      p(
        "For larger deployments, run PRAXIS on Kubernetes. Each service maps to a workload, and state lives in persistent volumes and managed services.",
      ),
      h2("Workloads"),
      ul([
        "API deployment with horizontal scaling behind a service.",
        "Frontend deployment serving static assets.",
        "Worker deployment — scale replicas with the processing load.",
        "The analysis engine as a dedicated workload.",
      ]),
      h2("State",
      ),
      ul([
        "PostgreSQL — managed database service or stateful workload.",
        "Redis — managed cache or stateful workload.",
        "Object storage for documents and evidence.",
      ]),
      h2("Configuration",
      ),
      p(
        "Configure through the same environment variables as Docker, provided via ConfigMaps and Secrets. Keep secrets in a Secret or your cloud secret manager.",
      ),
      h2("Observability",
      ),
      p(
        "Expose the health endpoint and container metrics. Workers and the API log to stdout for collection by your logging stack.",
      ),
      h2("Rolling updates"),
      p(
        "Releases are image tag replacements. Use rolling updates with readiness probes from the health endpoint; back up state before major upgrades.",
      ),
    ],
  },

  {
    slug: "backup-recovery",
    title: "Backup & Recovery",
    description:
      "What to back up, on what schedule, and how to restore PRAXIS.",
    updated: UPDATED,
    sections: [
      p(
        "The compliance record is the asset. Backups protect the database, the document and evidence store, and the configuration that defines the deployment.",
      ),
      h2("What to back up"),
      ul([
        "The database (PostgreSQL) — the system of record.",
        "Document and evidence files — object storage or disk.",
        "Configuration — environment and compose files.",
      ]),
      h2("Backup schedule",
      ),
      table(
        ["Data", "Recommended cadence"],
        [
          ["Database", "Daily full + continuous archive (WAL shipping or PITR)."],
          ["Documents & evidence", "Daily incremental, weekly full."],
          ["Configuration", "On every change, version-controlled."],
        ],
      ),
      h2("Restore"),
      code(
        "# Restore the database\npg_restore --clean --if-exists \\\n  -d praxis latest-dump.sql",
        "bash",
      ),
      p(
        "Restore the database to the point in time you need, then restore documents and evidence to match. Verify a restore in a staging environment at least quarterly.",
      ),
      h2("Retention",
      ),
      p(
        "Keep audit and evidence records for at least the retention periods required of your firm — commonly five years. Backup retention should cover regulatory requirements, not just disaster recovery.",
      ),
      note(
        "Test your restores",
        "An untested backup is a hope, not a plan. Schedule a restore drill and confirm the health endpoint and an uploaded document work after recovery.",
      ),
    ],
  },
];
