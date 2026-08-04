import { Link } from "react-router-dom";
import { ArrowRight, Upload, Rocket, FileText, ListChecks } from "lucide-react";
import { DOCS_NAV, getDocPage } from "@/docs";
import { readingMinutes } from "../../components/docs/docs-utils";
import type { ComponentType } from "react";

const QUICK_STARTS: { title: string; slug: string; icon: ComponentType<{ className?: string }> }[] = [
  { title: "Install PRAXIS", slug: "installation", icon: Rocket },
  { title: "Deploy PRAXIS", slug: "cloud", icon: Upload },
  { title: "Upload Your First Circular", slug: "upload-first-circular", icon: FileText },
  { title: "Review Obligations", slug: "obligations-module", icon: ListChecks },
];

export default function DocsHome() {
  return (
    <div>
      <header className="py-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          PRAXIS Documentation
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-6 text-gray-500">
          Everything you need to deploy, configure, and operate PRAXIS across your organization. Onboard your teams,
          process regulations, manage obligations, automate workflows, and integrate with the systems you already use.
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_STARTS.map(({ title, slug, icon: Icon }) => {
          const page = getDocPage(slug);
          return (
            <Link
              key={slug}
              to={`/docs/${slug}`}
              className="group rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-500">
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-medium text-gray-900">{title}</p>
              <p className="mt-1 text-xs text-gray-400">
                {page ? `${readingMinutes(page)} min read` : "Get started"}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="mt-14">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Browse Documentation</h2>
          <Link to="/docs/terminology" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
            Reference index <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DOCS_NAV.map((section) => (
            <div key={section.id} className="rounded-lg border border-gray-200 p-4">
              <Link
                to={`/docs/${section.pages[0].slug}`}
                className="text-sm font-semibold text-gray-900 hover:text-gray-700"
              >
                {section.title}
              </Link>
              <ul className="mt-2 space-y-1">
                {section.pages.slice(0, 4).map((p) => (
                  <li key={p.slug}>
                    <Link to={`/docs/${p.slug}`} className="block text-[13px] text-gray-500 hover:text-gray-900">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
