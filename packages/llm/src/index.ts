import { loadEnv } from "@venture-os/config";

export type CompletionMessage = { role: "system" | "user" | "assistant"; content: string };

export type CompletionRequest = {
  messages: CompletionMessage[];
  temperature?: number;
  maxTokens?: number;
};

export type CompletionResponse = {
  text: string;
  provider: string;
  model: string;
};

export interface LlmProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<CompletionResponse>;
}

export class MissingLlmKeyError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not set — refusing to invent a completion");
    this.name = "MissingLlmKeyError";
  }
}

export class OpenAiProvider implements LlmProvider {
  readonly name = "openai";
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    if (!this.apiKey) throw new MissingLlmKeyError();
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: this.apiKey });
    const res = await client.chat.completions.create({
      model: this.model,
      temperature: req.temperature ?? 0,
      max_tokens: req.maxTokens ?? 800,
      messages: req.messages,
    });
    const text = res.choices[0]?.message?.content ?? "";
    return { text, provider: this.name, model: this.model };
  }
}

/** Swappable later (Azure OpenAI, etc.). Domain code depends on LlmProvider only. */
export function createLlmProvider(env = loadEnv()): LlmProvider {
  const provider = env.LLM_PROVIDER;
  if (provider !== "openai") {
    // Do not silently fall through to a different vendor.
    throw new Error(`LLM_PROVIDER=${provider} is not implemented. Locked default is openai.`);
  }
  return new OpenAiProvider(env.OPENAI_API_KEY ?? "", env.OPENAI_MODEL);
}
