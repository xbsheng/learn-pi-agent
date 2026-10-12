[中文](README.md) | English

# s10: Custom providers — the model is not only from one vendor; plug in your own

[s09](../s09_rpc/) → `s10` → [s11](../s11_pi_packages/) → ...
> *"The model is not only from one vendor; plug in your own."* — pi's model layer is open.
>
> **Harness layer**: model access — keeping the harness from being locked to a single vendor.

---

## The problem

pi ships with a pile of providers: Anthropic, OpenAI, Gemini, DeepSeek, Groq, Bedrock, and more. But you may:

- Have vLLM / Ollama deployed on the internal network and want to use a private model.
- Use some OpenAI-compatible third-party inference service that pi does not ship with.
- Want to declare several model entries for the same service (different context windows, different prices).

None of these should require forking pi.

## The solution

Two paths, pick either:

**A. Programmatic (SDK)** — `ModelRuntime.registerProvider()`:

```typescript
const runtime = await ModelRuntime.create();

runtime.registerProvider("local-openai", {
  baseUrl: "http://localhost:11434/v1",   // any OpenAI-compatible endpoint
  apiKey: "not-needed",
  api: "openai-completions",
  models: [{
    id: "qwen2.5-coder:7b",
    name: "Qwen2.5 Coder 7B (local)",
    reasoning: false,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 32768,
    maxTokens: 8192,
  }],
});

const model = runtime.getModel("local-openai", "qwen2.5-coder:7b");
const { session } = await createAgentSession({ model, modelRuntime: runtime });
```

**B. Extension** — `pi.registerProvider()`, so the CLI/TUI can use it too:

```typescript
export default function (pi: ExtensionAPI) {
  pi.registerProvider("local-openai", {
    baseUrl: process.env.LOCAL_BASE_URL ?? "http://localhost:11434/v1",
    apiKey: "$LOCAL_OPENAI_API_KEY",   // $ENV means: read from the environment at runtime
    api: "openai-completions",
    models: [ /* ... */ ],
  });
}
```

```bash
LOCAL_OPENAI_API_KEY=xxx pi -e ./provider.ts --provider local-openai --model qwen2.5-coder:7b
```

## How it works

### The fields of a provider config

| Field | Notes |
|---|---|
| `baseUrl` | API root; OpenAI-compatible services usually end in `/v1` |
| `api` | protocol type: `openai-completions`, `anthropic-messages`, etc. |
| `apiKey` | the key itself, or `$ENV_NAME` to reference an environment variable |
| `models[]` | per-model metadata: `id`, `contextWindow`, `maxTokens`, `input`, `cost`, `reasoning` |

`contextWindow` and `maxTokens` are not decoration: pi uses them to decide when to compact and how to truncate output. Get them wrong and you either compact needlessly often or get rejected by the API when you exceed the limit.

### Credential resolution order

`ModelRuntime` looks for credentials in order:

1. Runtime override (`setRuntimeApiKey`, not persisted)
2. Stored credentials in `auth.json` (API key or OAuth)
3. Environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, …)
4. The custom provider fallback (the key in `models.json`)

### A third way: models.json

If you only want to add model entries without writing code, edit `~/.pi/agent/models.json` directly. pi loads it at startup, and `pi --list-models` shows it. The extension form is good when models must be discovered dynamically (for example, fetching a local service's `/v1/models` at startup).

### Async factory: discovering models dynamically

The extension factory may be async and fetch the available models at startup:

```typescript
export default async function (pi: ExtensionAPI) {
  const res = await fetch("http://localhost:1234/v1/models");
  const { data } = await res.json();
  pi.registerProvider("local-openai", {
    baseUrl: "http://localhost:1234/v1",
    api: "openai-completions",
    models: data.map((m) => ({ id: m.id, /* ... */ })),
  });
}
```

pi waits for this Promise before continuing startup, so `pi --list-models` also sees the dynamically discovered models.

## What changed

| Component | s09 | s10 |
|---|---|---|
| Model source | pi's built-in providers | built-ins + custom providers |
| Onboarding | login / config | `registerProvider()` |
| Keys | — | `$ENV_NAME` references an environment variable |
| Model metadata | built in | you declare `contextWindow` / `cost` |
| Loop | unchanged | unchanged |

## Try it

```bash
npm run s10
```

No real inference service is needed: the script registers a provider, fetches the model, sets it as the session model, and prints the result. To actually run inference, start Ollama:

```bash
ollama serve &
ollama pull qwen2.5-coder:7b
LOCAL_OPENAI_API_KEY=x pi -e ./s10_custom_provider/provider.ts \
  --provider local-openai --model qwen2.5-coder:7b -p "Write a quicksort"
```

A few more:

- Point `baseUrl` at a port that does not exist and run `npm run s10` again — registration still succeeds, showing this chapter only validates the config layer
- Add another entry `qwen2.5-coder:14b` to `models` and fetch it with `runtime.getModel`
- Set `apiKey` to `"$LOCAL_OPENAI_API_KEY"` without setting the env var and watch what `provider.ts` does

## Key points

- `ModelRuntime.registerProvider()` (SDK) or `pi.registerProvider()` (extension) connects any OpenAI-compatible service.
- `$ENV_NAME` references an environment variable; never hard-code keys.
- `contextWindow` / `maxTokens` directly affect compaction and truncation; get them right.
- The no-code option is `~/.pi/agent/models.json`.

## Next

So far your extensions, skills, and templates are scattered locally. **s11: Pi Package** packs them into one installable, shareable unit.
