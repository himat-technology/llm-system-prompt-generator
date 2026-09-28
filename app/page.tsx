import { PromptWorkspace } from "@/components/prompt-workspace";
import { BracesIcon, CodeIcon, LockIcon, PlayIcon, ShieldIcon, SparkIcon } from "@/components/ui/icons";

const STEPS = [
  {
    title: "Define persona & primary task",
    body: "Start from a starter preset or write your own role, objective, rules and output schema.",
  },
  {
    title: "Configure tags, reasoning & safety",
    body: "Toggle XML structure, structured reasoning depth, and prompt-injection-resistant guardrails.",
  },
  {
    title: "Test variables & export",
    body: "Fill {{variables}} in the simulator, review validation, then copy or download .md, .xml or .txt.",
  },
];

const FEATURES = [
  { icon: SparkIcon, title: "Role & persona engineering", body: "Precise roles, tone, domain context and behavioral boundaries." },
  { icon: CodeIcon, title: "Structured output formats", body: "Markdown, plain text, or well-formed XML with CDATA-safe content." },
  { icon: ShieldIcon, title: "Guardrails & refusal handling", body: "Instruction hierarchy, secret protection, scope and graceful refusal." },
  { icon: BracesIcon, title: "Dynamic variable templating", body: "Reusable {{placeholders}} with auto-detection and live substitution." },
  { icon: PlayIcon, title: "Validation & size estimates", body: "Catches missing sections, undefined variables and malformed tags." },
  { icon: LockIcon, title: "100% browser-local", body: "No servers, no analytics, no LLM calls. Nothing leaves your device." },
];

const FAQ = [
  {
    q: "What is an LLM system prompt?",
    a: "A system prompt (or system instruction) sets the baseline behavior, persona, rules, safety guardrails and response format for an AI model before any user interaction.",
  },
  {
    q: "Why use XML tags or structured Markdown?",
    a: "Clearly delimited sections help models separate instructions from data and follow each rule more reliably. Many models, including Claude, respond especially well to XML-tagged prompts.",
  },
  {
    q: "Does the reasoning option reveal the model's chain-of-thought?",
    a: "No. It adds instructions asking the model to reason internally and return only conclusions, decisions and concise justification. This tool never calls a model and cannot expose hidden reasoning.",
  },
  {
    q: "Are my prompts stored or sent anywhere?",
    a: "No. Everything runs in your browser. Optional draft saving uses this browser's localStorage only, is off by default, and never stores drafts that look like they contain credentials.",
  },
  {
    q: "How accurate is the token estimate?",
    a: "It is a heuristic of roughly 1 token per 4 characters for English text. Real counts depend on the model's tokenizer, language and content.",
  },
];

const CONTACT_LINKS = [
  {
    label: "Website",
    text: "himat.co.in",
    href: "https://himat.co.in",
    external: true,
    tone: "bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100",
  },
  {
    label: "Email",
    text: "info@himat.co.in",
    href: "mailto:info@himat.co.in",
    external: false,
    tone: "bg-rose-50 text-rose-700 ring-rose-200 hover:bg-rose-100",
  },
  {
    label: "Phone",
    text: "+91 94452 34023",
    href: "tel:+919445234023",
    external: false,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100",
  },
  {
    label: "LinkedIn",
    text: "LinkedIn",
    href: "https://www.linkedin.com/company/himat-technology",
    external: true,
    tone: "bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100",
  },
  {
    label: "Facebook",
    text: "Facebook",
    href: "https://www.facebook.com/people/Himat-technology/61593829197445/",
    external: true,
    tone: "bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100",
  },
  {
    label: "Instagram",
    text: "Instagram",
    href: "https://www.instagram.com/himat_technology",
    external: true,
    tone: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200 hover:bg-fuchsia-100",
  },
] as const;

export default function Home() {
  return (
    <>
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <BracesIcon />
            </span>
            <a
              href="https://himat.co.in"
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring rounded text-sm font-semibold tracking-tight text-slate-900 hover:text-indigo-700"
            >
              HiMat Technology
            </a>
            <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 sm:inline">
              Free tool
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            <LockIcon width={13} height={13} /> Runs locally · No sign-up
          </span>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-[92rem] px-4 pt-10 pb-6 sm:px-6 sm:pt-14">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">Prompt engineering workspace</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              LLM System Prompt Generator &amp; Optimizer
            </h1>
            <p className="mt-3 text-base text-slate-600 sm:text-lg">
              Design, structure, validate, and test production-grade AI system prompts.
            </p>
          </div>
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 sm:items-center">
            <ShieldIcon className="mt-0.5 shrink-0 text-emerald-700 sm:mt-0" width={20} height={20} />
            <p className="text-sm text-emerald-900">
              <strong className="font-semibold">100% Browser-Local Processing &amp; Privacy First.</strong>{" "}
              Your prompts and variables never leave your browser — no servers, no analytics, no LLM API calls.
            </p>
          </div>
        </section>

        <section aria-label="Prompt workspace" className="mx-auto max-w-[92rem] px-2 pb-12 sm:px-6">
          <div className="card">
            <PromptWorkspace />
          </div>
        </section>

        <section aria-labelledby="how-heading" className="border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-[92rem] px-4 py-12 sm:px-6">
            <h2 id="how-heading" className="text-xl font-bold tracking-tight text-slate-900">
              How to engineer production-grade system prompts
            </h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-slate-200 p-5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{step.body}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3 rounded-xl bg-slate-50 p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-slate-200">
                    <Icon />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
                    <p className="mt-0.5 text-sm text-slate-600">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="faq-heading" className="border-t border-slate-200">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
            <h2 id="faq-heading" className="text-xl font-bold tracking-tight text-slate-900">
              Frequently asked questions
            </h2>
            <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
              {FAQ.map((item) => (
                <details key={item.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded font-medium text-slate-900">
                    {item.q}
                    <span aria-hidden className="text-slate-400 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[92rem] gap-6 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
          <div>
            <p className="text-sm font-semibold text-slate-900">Built by HiMat Technology</p>
            <p className="mt-1 text-xs text-slate-500">
              LLM System Prompt Generator &amp; Optimizer — runs entirely in your browser.
            </p>
            <p className="mt-1 text-xs text-slate-500">No accounts · No servers · No tracking · No API keys</p>
          </div>
          <nav aria-label="HiMat Technology contact">
            <ul className="flex flex-wrap gap-2 text-xs md:justify-end">
              {CONTACT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium ring-1 transition-colors ${link.tone}`}
                  >
                    <span className="sr-only">{link.label}: </span>
                    {link.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </>
  );
}
