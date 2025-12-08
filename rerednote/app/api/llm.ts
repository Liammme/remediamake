// api/llm.ts
// 这是部署在 Vercel 上的 Serverless 函数，用来中转到 yunwu.ai（OpenAI 兼容）

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt } = req.body as { prompt?: string };

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: '缺少 prompt 字段' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.yunwu.ai/v1'; // 如果有自己的 baseUrl 就在 Vercel 里改环境变量
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

    if (!apiKey) {
      return res.status(500).json({ error: '未配置 OPENAI_API_KEY 环境变量' });
    }

    // 调用 yunwu 的 OpenAI 兼容 /chat/completions 接口
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: '你是一名擅长中文小红书写作的助手，严格按照用户给的提示词执行。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('上游模型错误：', text);
      return res.status(500).json({ error: '调用大模型失败', detail: text });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '服务器内部错误' });
  }
}
