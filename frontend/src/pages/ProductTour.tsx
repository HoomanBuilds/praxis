import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bot, FileSearch, LayoutDashboard, ListChecks, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { Logo } from "@/components/Logo";

const steps = [
  ["01", "Import", "Add a SEBI circular and preserve its source metadata."],
  ["02", "Review", "Validate extracted obligations before they enter operations."],
  ["03", "Act", "Assign owners, tasks, deadlines, and supporting evidence."],
  ["04", "Prove", "Export a source-linked record of decisions and compliance status."],
];

const tourNavigation = [
  { icon: LayoutDashboard, label: "Command Center" },
  { icon: FileSearch, label: "Regulations" },
  { icon: ListChecks, label: "Obligations" },
  { icon: Bot, label: "Copilot" },
  { icon: ShieldCheck, label: "Audit Trail" },
];

export default function ProductTour() {
  const [loginPrompt, setLoginPrompt] = useState(false);
  const requestLogin = () => setLoginPrompt(true);

  return (
    <div className="min-h-screen bg-[#f5f5f4] text-[#171717]">
      <header className="mx-auto flex h-20 max-w-6xl items-center px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Praxis home">
          <Logo className="h-7 w-7" />
          <span className="text-lg font-semibold tracking-tight lowercase">praxis</span>
        </Link>
        <Link to="/login" className="ml-auto inline-flex h-11 items-center rounded-xl bg-neutral-950 px-5 text-sm font-medium text-white hover:bg-neutral-800">
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-950">
          <ArrowLeft className="h-4 w-4" /> Back to overview
        </Link>
        <div className="mt-10 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Product tour</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">One workflow from circular to evidence.</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600">
            Explore how Praxis connects regulatory interpretation, human review, operational ownership, and audit reporting.
          </p>
        </div>

        <section className="mt-14 grid gap-3 md:grid-cols-4" aria-label="Praxis workflow">
          {steps.map(([number, title, description]) => (
            <article key={number} className="rounded-2xl border border-neutral-200 bg-white p-5">
              <span className="text-xs font-semibold text-neutral-400">{number}</span>
              <h2 className="mt-5 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
            </article>
          ))}
        </section>

        <section className="mt-14 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_24px_70px_-35px_rgba(0,0,0,0.35)]">
          <div className="flex h-14 items-center border-b border-neutral-200 px-4 sm:px-5">
            <Logo className="h-5 w-5" />
            <span className="ml-2 text-sm font-semibold lowercase">praxis</span>
            <span className="ml-auto rounded-full bg-neutral-100 px-3 py-1 text-[11px] text-neutral-500">Example workspace</span>
          </div>
          <div className="grid md:grid-cols-[190px_1fr]">
            <aside className="hidden border-r border-neutral-200 p-4 md:block">
              {tourNavigation.map(({ icon: ItemIcon, label }, index) => (
                <button key={label} onClick={requestLogin} className={`mb-1 flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-xs ${index === 0 ? "bg-neutral-100 font-medium" : "text-neutral-500 hover:bg-neutral-50"}`}>
                  <ItemIcon className="h-4 w-4" /> {label}
                </button>
              ))}
            </aside>
            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Command Center</h2>
                  <p className="mt-1 text-sm text-neutral-500">A clear view of current compliance work.</p>
                </div>
                <button onClick={requestLogin} className="h-11 rounded-xl bg-neutral-950 px-5 text-sm font-medium text-white hover:bg-neutral-800">
                  Ask Copilot
                </button>
              </div>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ["Regulations", "Source-controlled"],
                  ["Obligations", "Human-reviewed"],
                  ["Audit trail", "Export-ready"],
                ].map(([label, value]) => (
                  <button key={label} onClick={requestLogin} className="rounded-2xl border border-neutral-200 p-5 text-left hover:border-neutral-400">
                    <span className="text-xs text-neutral-500">{label}</span>
                    <strong className="mt-3 block text-sm font-semibold">{value}</strong>
                  </button>
                ))}
              </div>
              <div className="mt-3 rounded-2xl border border-neutral-200 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4" /> Review queue</div>
                <div className="mt-4 space-y-2">
                  {["Verify applicability", "Confirm accountable department", "Approve implementation timeline"].map((item) => (
                    <button key={item} onClick={requestLogin} className="flex min-h-11 w-full items-center rounded-xl bg-neutral-50 px-3 text-left text-xs text-neutral-600 hover:bg-neutral-100">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {loginPrompt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="tour-login-title">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-neutral-100"><LockKeyhole className="h-5 w-5" /></div>
              <div>
                <h2 id="tour-login-title" className="font-semibold">Sign in to use this feature</h2>
                <p className="mt-1 text-sm leading-6 text-neutral-600">The tour is read-only. Use the demo account to work with the live Praxis workspace.</p>
              </div>
              <button onClick={() => setLoginPrompt(false)} aria-label="Close sign-in prompt" className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl hover:bg-neutral-100"><X className="h-4 w-4" /></button>
            </div>
            <Link to="/login" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-neutral-950 text-sm font-medium text-white hover:bg-neutral-800">
              Continue to sign in
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
