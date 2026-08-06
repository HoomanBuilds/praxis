import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileSearch, ShieldCheck, Workflow } from "lucide-react";
import { Logo } from "@/components/Logo";

const capabilities = [
  {
    icon: FileSearch,
    title: "Translate regulation",
    description: "Turn SEBI circulars into structured obligations with paragraph-level traceability.",
  },
  {
    icon: Workflow,
    title: "Operationalize compliance",
    description: "Assign owners, tasks, evidence, deadlines, and review gates from one workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Stay audit ready",
    description: "Preserve decisions and source records in a clear, exportable audit trail.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#171717]">
      <header className="mx-auto flex h-20 max-w-6xl items-center px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Praxis home">
          <Logo className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight lowercase">praxis</span>
        </Link>
        <nav className="ml-auto flex items-center gap-2" aria-label="Public navigation">
          <Link to="/docs" className="hidden rounded-lg px-4 py-2 text-sm text-neutral-600 hover:bg-white hover:text-neutral-950 sm:block">
            Documentation
          </Link>
          <Link to="/login" className="inline-flex h-11 items-center rounded-xl bg-neutral-950 px-5 text-sm font-medium text-white hover:bg-neutral-800">
            Sign in
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-5 pb-20 pt-16 text-center sm:px-8 sm:pb-28 sm:pt-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" />
            Agentic compliance for securities markets
          </div>
          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl sm:leading-[1.05]">
            From regulatory text to accountable action.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-neutral-600 sm:text-lg">
            Praxis helps securities market intermediaries interpret SEBI regulations, manage obligations, and prove compliance from a single auditable workspace.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/tour" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-6 text-sm font-medium text-white hover:bg-neutral-800 sm:w-auto">
              Product tour
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/login" className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-neutral-300 bg-white px-6 text-sm font-medium hover:border-neutral-400 sm:w-auto">
              Open demo workspace
            </Link>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-500">
            {[
              "Human review gates",
              "Source-linked answers",
              "Deployment-controlled data",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> {item}
              </span>
            ))}
          </div>
        </section>

        <section className="border-y border-neutral-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-px bg-neutral-200 sm:grid-cols-3">
            {capabilities.map((item) => (
              <article key={item.title} className="bg-white p-7 sm:p-9">
                <div className="mb-6 grid h-11 w-11 place-items-center rounded-xl border border-neutral-200 bg-neutral-50">
                  <item.icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-neutral-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8 sm:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Built for accountable decisions</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Every answer keeps the source in view.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-neutral-600 sm:text-base">
            Praxis combines structured workflow logic with grounded analysis. Reviewers can verify the source, understand the reasoning, and retain a complete decision trail.
          </p>
        </section>
      </main>

      <footer className="border-t border-neutral-200 px-5 py-8 text-center text-xs text-neutral-500">
        Praxis compliance intelligence platform
      </footer>
    </div>
  );
}
