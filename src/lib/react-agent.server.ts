import { streamText } from "ai";
import { resolveModel, type ProviderId } from "./ai-provider.server";
import { formatObservation, searchAgenticWeb, type SearchHit } from "./agentic-search.server";

export type AgentStep = {
  index: number;
  thought: string;
  action?: { tool: "search"; input: string };
  observation?: string;
  hits?: SearchHit[];
};

export type AgentRun = {
  question: string;
  modelLabel: string;
  steps: AgentStep[];
  answer: string;
  sources: SearchHit[];
  stopped: "finished" | "max_steps";
};

const MAX_STEPS = 5;

const SYSTEM_PROMPT = `You are a ReAct agent specialised in the Agentic AI domain (LLM agents, ReAct, tool use, planning, multi-agent systems, orchestration frameworks, RAG, MCP, evaluation and safety of agents).

You answer questions by interleaving reasoning and web search over Agentic AI sources (research papers, reference articles, practitioner discussions).

Reply with EXACTLY one cycle per turn, in this format and nothing else:

Thought: <your reasoning about what you know and what you still need>
Action: search[<a focused search query>]

or, when you have enough evidence:

Thought: <final reasoning>
Action: finish[<a complete answer in markdown-free plain prose, citing sources as [1], [2] matching the observations>]

Rules:
- Never invent observations; only rely on observations provided to you.
- If the question is outside the Agentic AI domain, use finish[] to say so briefly and point to the closest agentic-AI angle.
- Keep each search query short and specific. Do not repeat an identical query.`;

function parseCycle(text: string) {
  const thought =
    text.match(/Thought:\s*([\s\S]*?)(?=\nAction:|$)/i)?.[1]?.trim() || text.trim().slice(0, 400);
  const searchMatch = text.match(/Action:\s*search\[([\s\S]*?)\]/i);
  const finishMatch = text.match(/Action:\s*finish\[([\s\S]*)\]/i);
  return {
    thought,
    search: searchMatch?.[1]?.trim(),
    finish: finishMatch?.[1]?.trim(),
  };
}

export async function runReActAgent(question: string, provider: ProviderId): Promise<AgentRun> {
  const { model, label } = resolveModel(provider);

  const transcript: string[] = [`Question: ${question}`];
  const steps: AgentStep[] = [];
  const sources: SearchHit[] = [];

  for (let i = 0; i < MAX_STEPS; i++) {
    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt: `${transcript.join("\n\n")}\n\nProduce the next Thought and Action.`,
    });
    const text = await result.text;
    const cycle = parseCycle(text);

    if (cycle.finish || !cycle.search) {
      steps.push({ index: i + 1, thought: cycle.thought });
      return {
        question,
        modelLabel: label,
        steps,
        answer: cycle.finish || text.trim(),
        sources,
        stopped: "finished",
      };
    }

    const { query, hits } = await searchAgenticWeb(cycle.search);
    const observation = formatObservation(query, hits);

    for (const hit of hits) {
      if (!sources.some((s) => s.url === hit.url)) sources.push(hit);
    }

    steps.push({
      index: i + 1,
      thought: cycle.thought,
      action: { tool: "search", input: cycle.search },
      observation,
      hits,
    });

    transcript.push(
      `Thought: ${cycle.thought}\nAction: search[${cycle.search}]\nObservation:\n${observation}`,
    );
  }

  // Out of steps: force a final answer from what we gathered.
  const final = streamText({
    model,
    system: SYSTEM_PROMPT,
    prompt: `${transcript.join(
      "\n\n",
    )}\n\nYou have reached the search budget. Reply now with a single Thought and Action: finish[...] using only the observations above.`,
  });
  const finalText = await final.text;
  const finalCycle = parseCycle(finalText);
  steps.push({ index: steps.length + 1, thought: finalCycle.thought });

  return {
    question,
    modelLabel: label,
    steps,
    answer: finalCycle.finish || finalText.trim(),
    sources,
    stopped: "max_steps",
  };
}
