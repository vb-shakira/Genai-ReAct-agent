import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { runReActAgent, type AgentRun } from "./react-agent.server";

const AskInput = z.object({
  question: z.string().min(3).max(500),
  provider: z.enum(["lovable", "groq"]).default("lovable"),
});

export const askAgent = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AskInput.parse(input))
  .handler(async ({ data }): Promise<AgentRun> => {
    return runReActAgent(data.question, data.provider);
  });
