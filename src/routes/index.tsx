import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowRight,
  BrainCircuit,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  Terminal,
} from "lucide-react";

import { askAgent } from "@/lib/react-agent.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReAct Agent Console — Agentic AI Q&A" },
      {
        name: "description",
        content:
          "Ask questions about agentic AI and watch a ReAct agent think, search research and community sources, then answer with citations.",
      },
      { property: "og:title", content: "ReAct Agent Console — Agentic AI Q&A" },
      {
        property: "og:description",
        content:
          "Ask questions about agentic AI and watch a ReAct agent think, search, and answer with citations.",
      },
    ],
  }),
  component: Home,
});

const PROVIDERS = [
  { id: "lovable", label: "Lovable AI", hint: "GPT-5.6 · no setup" },
  { id: "groq", label: "Groq", hint: "Llama 3.3 70B · needs key" },
] as const;

const EXAMPLES = [
  "How does the ReAct pattern differ from chain-of-thought prompting?",
  "What are the main failure modes of multi-agent LLM systems?",
  "How is MCP used to give agents tool access?",
];

function Home() {
  const [question, setQuestion] = useState("");
  const [provider, setProvider] = useState<"lovable" | "groq">("lovable");
  const ask = useServerFn(askAgent);

  const run = useMutation({
    mutationFn: (input: { question: string; provider: "lovable" | "groq" }) =>
      ask({ data: input }),
  });

  const submit = (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 3) return;
    setQuestion(trimmed);
    run.mutate({ question: trimmed, provider });
  };

  const result = run.data;

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-14 md:py-20">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          <BrainCircuit className="size-3.5 text-primary" />
          Agentic AI domain
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">
          <span className="text-gradient">ReAct</span> Agent Console
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
          Reason → Act → Observe. The agent thinks out loud, searches agentic-AI research,
          reference and community sources, then answers with citations.
        </p>
      </header>

      <section className="panel mt-10 p-5 md:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(question);
          }}
        >
          <label htmlFor="q" className="font-mono text-xs uppercase tracking-widest text-primary">
            Question
          </label>
          <textarea
            id="q"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(question);
            }}
            rows={3}
            placeholder="Ask anything about LLM agents, tool use, planning, orchestration…"
            className="mt-2 w-full resize-none rounded-lg border border-input bg-background/60 p-3 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/30"
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                    provider === p.id
                      ? "border-primary bg-primary/10 text-foreground glow"
                      : "border-border bg-card/50 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  <span className="block font-medium">{p.label}</span>
                  <span className="font-mono text-[10px] uppercase tracking-wider opacity-70">
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={run.isPending || question.trim().length < 3}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {run.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {run.isPending ? "Reasoning…" : "Run agent"}
            </button>
          </div>
        </form>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => submit(ex)}
              className="rounded-full border border-border bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </section>

      {run.isError && (
        <p className="panel mt-6 border-destructive/60 p-4 text-sm text-destructive">
          {(run.error as Error).message}
        </p>
      )}

      {run.isPending && (
        <p className="mt-6 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          Thinking, searching, observing…
        </p>
      )}

      {result && (
        <article className="mt-10 space-y-8">
          <section>
            <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
              <Terminal className="size-3.5" /> Reasoning trace · {result.modelLabel}
            </h2>
            <div className="trace-rail mt-4 space-y-4">
              <span className="trace-rail-line" aria-hidden />
              {result.steps.map((step) => (
                <div key={step.index} className="panel p-4">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-accent">
                    Step {step.index} · Thought
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground">{step.thought}</p>

                  {step.action && (
                    <p className="mt-3 flex items-center gap-2 font-mono text-xs text-primary">
                      <Search className="size-3.5" />
                      search[{step.action.input}]
                    </p>
                  )}

                  {step.hits && step.hits.length > 0 && (
                    <ul className="mt-3 space-y-2 border-l border-border pl-3">
                      {step.hits.map((hit, i) => (
                        <li key={hit.url + i} className="text-xs text-muted-foreground">
                          <a
                            href={hit.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary"
                          >
                            {hit.title}
                            <ExternalLink className="size-3" />
                          </a>
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-accent">
                            {hit.source}
                          </span>
                          <p className="mt-1 leading-relaxed">{hit.snippet}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-5 md:p-6">
            <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
              <ArrowRight className="size-3.5" /> Answer
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground md:text-base">
              {result.answer}
            </p>
            {result.stopped === "max_steps" && (
              <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-accent">
                Search budget reached — answer synthesised from gathered evidence.
              </p>
            )}
          </section>

          {result.sources.length > 0 && (
            <section>
              <h2 className="font-mono text-xs uppercase tracking-widest text-primary">Sources</h2>
              <ol className="mt-3 space-y-1.5">
                {result.sources.map((s, i) => (
                  <li key={s.url} className="text-xs text-muted-foreground">
                    <span className="font-mono text-accent">[{i + 1}]</span>{" "}
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-primary"
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </article>
      )}
    </main>
  );
}
