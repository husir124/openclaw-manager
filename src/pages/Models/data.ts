/**
 * Models 页面静态数据
 */

// 已知的 OpenClaw 内置 provider
export const BUILTIN_PROVIDERS: Record<string, { name: string; description: string }> = {
  openrouter: { name: 'OpenRouter', description: '多模型聚合平台，支持数百种模型' },
  openai: { name: 'OpenAI', description: 'GPT-4o, o1, Codex 等' },
  anthropic: { name: 'Anthropic', description: 'Claude 系列模型' },
  deepseek: { name: 'DeepSeek', description: 'DeepSeek 系列模型' },
  moonshot: { name: 'Moonshot (Kimi)', description: 'Kimi 系列模型' },
  google: { name: 'Google', description: 'Gemini 系列模型' },
  xiaomi: { name: 'Xiaomi', description: '小米大模型' },
  ollama: { name: 'Ollama', description: '本地模型运行' },
}
