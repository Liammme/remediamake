// rerednote/api/llm.ts

// 这里不用额外安装类型库，直接用 any 就行
export default async function handler(req: any, res: any) {
  // 只允许 POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  try {
    const { prompt } = req.body || {};

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing prompt' });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!apiKey) {
      res.status(500).json({ error: 'OPENAI_API_KEY is not set' });
      return;
    }

    // 直连 OpenAI 兼容接口（你在 Vercel 里配的是 https://yunwu.ai）
    const upstreamResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      console.error('Upstream LLM error:', upstreamResponse.status, data);
      // 把上游的错误信息一并返回，方便你在浏览器里看到具体原因
      res.status(500).json({
        error: 'Upstream LLM error',
        status: upstreamResponse.status,
        detail: data,
      });
      return;
    }

    // 直接把上游返回的完整数据转发给前端
    res.status(200).json(data);
  } catch (err: any) {
    console.error('LLM handler crashed:', err);
    res.status(500).json({
      error: 'Internal server error',
      detail: err?.message || String(err),
    });
  }
}
