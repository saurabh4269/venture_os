import { afterEach, describe, expect, it, vi } from "vitest";
import { AnthropicProvider, createLlmProvider, MissingLlmKeyError, OpenAiProvider } from "./index.js";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("llm providers", () => {
  it("OpenAI refuses without a key", async () => {
    const p = new OpenAiProvider("", "gpt-4o-mini");
    await expect(p.complete({ messages: [{ role: "user", content: "hi" }] })).rejects.toBeInstanceOf(
      MissingLlmKeyError,
    );
  });

  it("Anthropic Messages API uses x-api-key and system + messages shape", async () => {
    const fetchMock = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        system?: string;
        messages?: unknown[];
        model?: string;
      };
      expect(body.system).toContain("cite");
      expect(body.messages).toEqual([{ role: "user", content: "cash?" }]);
      expect(body.model).toBe("claude-sonnet-4-5");
      const headers = init?.headers as Record<string, string>;
      expect(headers["x-api-key"]).toBe("sk-ant-test");
      expect(headers["anthropic-version"]).toBe("2023-06-01");
      return Response.json({
        content: [{ type: "text", text: "refused without evidence" }],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const p = new AnthropicProvider("sk-ant-test", "claude-sonnet-4-5");
    const res = await p.complete({
      messages: [
        { role: "system", content: "cite or refuse" },
        { role: "user", content: "cash?" },
      ],
    });
    expect(res.provider).toBe("anthropic");
    expect(res.text).toBe("refused without evidence");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("createLlmProvider selects anthropic when LLM_PROVIDER=anthropic", () => {
    const p = createLlmProvider({
      LLM_PROVIDER: "anthropic",
      ANTHROPIC_API_KEY: "sk-ant-x",
      ANTHROPIC_MODEL: "claude-sonnet-4-5",
      OPENAI_API_KEY: "",
      OPENAI_MODEL: "gpt-4o-mini",
    } as never);
    expect(p.name).toBe("anthropic");
  });
});
