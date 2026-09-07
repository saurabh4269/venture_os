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
  constructor(provider = "openai") {
    super(
      provider === "anthropic"
        ? "ANTHROPIC_API_KEY is not set — refusing to invent a completion"
        : "OPENAI_API_KEY is not set — refusing to invent a completion",
    );
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
    if (!this.apiKey) throw new MissingLlmKeyError("openai");
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

/**
 * Anthropic Messages API (brief Claude reasoning layer).
 * https://docs.anthropic.com/en/api/messages — x-api-key + anthropic-version.
 * Default remains OpenAI (DECISION D5); set LLM_PROVIDER=anthropic to use Claude.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    if (!this.apiKey) throw new MissingLlmKeyError("anthropic");
    const system = req.messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const messages = req.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    if (!messages.length) {
      return { text: "", provider: this.name, model: this.model };
    }
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 800,
        temperature: req.temperature ?? 0,
        ...(system ? { system } : {}),
        messages,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`anthropic_complete_failed:${res.status}:${body.slice(0, 280)}`);
    }
    const json = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = (json.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text!)
      .join("");
    return { text, provider: this.name, model: this.model };
  }
}

/** Swappable: openai (default) or anthropic. Domain code depends on LlmProvider only. */
export function createLlmProvider(env = loadEnv()): LlmProvider {
  const provider = (env.LLM_PROVIDER || "openai").toLowerCase().trim();
  if (provider === "anthropic") {
    return new AnthropicProvider(env.ANTHROPIC_API_KEY ?? "", env.ANTHROPIC_MODEL);
  }
  if (provider !== "openai") {
    throw new Error(`LLM_PROVIDER=${provider} is not implemented. Use openai (default) or anthropic.`);
  }
  return new OpenAiProvider(env.OPENAI_API_KEY ?? "", env.OPENAI_MODEL);
}
