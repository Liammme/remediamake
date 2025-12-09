import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

// 前端调用后端 /api/llm 的通用函数
async function callLLM(prompt: string): Promise<string> {
  const response = await fetch('/api/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('LLM 调用失败：', text);
    throw new Error('调用写作接口失败');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  return (content as string).trim();
}

// Helper to clean markdown/结构化痕迹
const cleanText = (text: string): string => {
  if (!text) return '';
  return (
    text
      // 去掉 ** 加粗
      .replace(/\*\*/g, '')
      // 去掉 markdown 标题的 # 符号（保留后面的文字）
      .replace(/^[ \t]*#{1,6}[ \t]*/gm, '')
      // 去掉行首的「开头：/结尾：/启示：/小结：/总结：」这类标签
      .replace(
        /^[ \t]*[（(]?(开头|结尾|启示|小结|总结)[)）】]?[：:][ \t]*/gm,
        ''
      )
  );
};

const App: React.FC = () => {
  // State Management
  const [sourceText, setSourceText] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [generatedResult, setGeneratedResult] = useState<{
    article: string;
    titles: string;
  }>({
    article: '',
    titles: '',
  });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Navigation State
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Quick Links Data
  const categories: { id: string; label: string }[] = [
    { id: 'web3', label: 'Web3' },
    { id: 'ai', label: 'AI' },
  ];

  const quickLinks: Record<string, { title: string; url: string }[]> = {
    web3: [
      { title: '深潮 TechFlow', url: 'https://www.techflowpost.com/' },
      { title: '律动 BlockBeats', url: 'https://www.theblockbeats.info/' },
      { title: '吴说 Blockchain', url: 'https://www.wublock123.com/' },
    ],
    ai: [{ title: 'AI Base', url: 'https://www.aibase.com/zh/news' }],
  };

  // Step 1: Analyze Article
  const handleAnalyze = async () => {
    if (!sourceText.trim()) {
      setError('请先粘贴需要拆解的文章内容');
      return;
    }
    setError('');
    setIsAnalyzing(true);
    setAnalysisText('');

    try {
      const prompt = `
你现在的角色是「Talentverse 研究员 + 内容编辑」，长期负责输出 Web3 / AI 等相关的对外分析文章。下面有一篇【原文】，请对其做结构化拆解，用于后续二次创作。

【最高指令】
- 只做“拆解”和“提炼”，不要把原文改写成新文章。
- 严禁逐句照搬原文表述。
- 输出结果中严禁出现 "**" 符号或任何 Markdown 加粗语法。
- 尽量少用排比句和复杂比喻，如果使用类比，一篇分析中不超过 1–2 处，表达要简洁直接。
- 避免使用“我们”“我们看到”“我们认为”等主语，可用中性表达，例如“文章呈现出……”“在这些案例中可以看到……”。
- 语言风格参考知乎上高质量专业长文：逻辑清晰、客观、克制，有判断但不过度煽情。

【分析目标】
这份拆解会被放入一个中间编辑框，供人工微调后，再作为下一步生成新稿的输入。你的任务是：
- 提炼原文中的“逻辑、结构、视角”；
- 挖出文章真正击中的“读者痛点”；
- 找出文中已经存在或可以放大的“看法张力”；
- 给出适合 Talentverse 统一风格的二创切入方向。

【请按以下结构输出】（编号和小标题必须保留）

1. 主题与核心结论（2–3 句）
- 用自己的话概括：这篇原文在讨论什么问题？核心结论是什么？
- 尽量具体，避免“很重要”“值得思考”这类空泛评价。

2. 作者视角与隐含立场
- 作者是站在哪个位置说话？例如：猎头、创始人、一线从业者、媒体观察者等。
- 隐含的价值判断是什么？例如：反单一成功模板、重视长期主义、强调个体选择权等。

3. 核心逻辑骨架（3–6 条）
- 用条目形式拆出原文的推理链条，每条写成「小标题 + 一句话解释」。
- 要覆盖主线逻辑，而不是只摘某一段精彩表述。

4. 关键事实与案例
- 列出文中出现过的关键事实、案例或具体场景（每点一行）。
- 简要说明这些内容各自支撑了哪个观点（例如：用来说明代价、用来说明周期、用来说明心态变化等）。
- 不需要渲染情绪，只要把“事实 → 观点”的对应关系点出来。

5. 读者痛点与“第一反应点”（重点）
- 提炼 2–4 个文章真正击中的核心痛点。每个痛点按以下格式输出：
  - 痛点 X：一句话点出问题本身（例如：“对单一成功模板的迷信与自我怀疑”）。
  - 典型场景：用 1–2 句话描写一个具体场景，而不是抽象感受。
  - 对应的心理按钮：从以下三类中选择并标注一类或多类：
    - 「我被看见了」
    - 「我被冒犯 / 被颠覆了」
    - 「我不想吃亏 / 想走捷径」
  - 正文承接方向：后续在正文中，围绕这个痛点最适合展开什么类型的分析（例如：代价账、机制拆解、决策框架）。

6. “看法张力”的来源与结构
- 找出文中存在的“看法张力”，至少列出 2–4 个。每个按以下格式输出：
  - 张力点 X：用一句话概括这种张力（例如：“光鲜职业路径背后往往是家庭关系的价格”）。
  - 类型标记：从以下几类中选择：
    - 反常识联合
    - 情境置换
    - 价值重估
    - 矛盾可视化
  - 展开方式：原文是如何把这个张力“说圆”的？是通过案例、数据，还是通过逻辑推演？
  - 后续放大方向：在 Web3 / AI / 职场语境下，可以如何进一步利用这个张力做更深入的分析？

7. 写作结构与节奏模版
- 概括这篇文章的结构节奏，例如：
  - 「从标签或光环切入 → 举 1–2 个典型人物案例 → 抽出共性问题 → 提炼为几条可操作/可思考的结论」；
  - 或「提出问题 → 回顾行业/赛道变化 → 提取规律 → 给出对个人/组织的启示」。
- 说明这种结构适合哪一类选题（例如：祛魅类、周期类、职业路径类、决策取舍类等）。

8. 适合 Talentverse 的二创切入方向（至少 3 个）
- 基于以上拆解，给出 3–5 个重写方向，每个方向按「方向名 + 一句话说明」输出。
- 方向需要同时满足：
  - 更偏分析与解读，而不是粗暴经验分享；
  - 自然带出一个具体痛点或场景；
  - 自带一个可展开的观点冲突或价值重估。

原文内容：
${sourceText}
      `;

      const rawText = await callLLM(prompt);
      setAnalysisText(cleanText(rawText || '分析结果为空，请重试或检查文章内容。'));
    } catch (err) {
      console.error(err);
      setError('分析请求失败，请检查网络或稍后重试');
      setAnalysisText('（分析请求出错，请重试）');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Step 2: Generate New Draft
  const handleGenerate = async () => {
    if (!analysisText.trim()) {
      setError('中间的分析框不能为空，请先分析或手动输入拆解思路');
      return;
    }
    setError('');
    setIsGenerating(true);
    setGeneratedResult({ article: '', titles: '' });

    try {
      const prompt = `
你现在的角色是「Talentverse 研究员」，负责为团队的对外媒体账号撰写 Web3 / AI / 职场相关的分析文章。下面是一份已经整理好的【文章拆解分析】，请基于这份分析创作一篇全新的文章。

【风格定位】
- 平台：Talentverse 对外媒体账号，风格类似知乎上的高质量专业长文。
- 受众：关注 Web3 / AI 行业的一线从业者、创业者、候选人，以及对职场深度话题感兴趣的读者。
- 语气与人设：客观、冷静、有判断，重点在“解释事实背后的逻辑”。

【最高指令】
- 只能基于【文章拆解分析】中的逻辑、事实、痛点和“看法张力”进行展开，严禁直接照搬原文句子。
- 可以延展和举例，但不要编造具体公司名称或精确数据。
- 输出结果中严禁出现 "**" 符号或任何 Markdown 加粗语法。
- 不要使用“我们”“我们看到”“我们认为”等主语，可用中性或无主句表达。
- 尽量少用排比句和复杂比喻，如需类比，一篇文章最多 1–2 处，且表达要简洁直接。
- 正文中禁止出现以下结构化提示词作为小标题：
  - 「开头：」「结尾：」「启示：」「小结：」「总结：」
  - 禁止使用以 # 开头的 markdown 标题
  - 禁止写「正文如下」「标题如下」「备选标题」等说明文字

【写作风格参考】
- 逻辑清晰，有「问题 → 分析 → 小结」的结构。
- 判断犀利，但语气克制，不煽情、不喊口号。
- 更接近罗振宇式解读：先把现象讲清楚，再讲背后的机制和处境，最后给出可理解的判断。

【第一反应点：开头】
- 从【文章拆解分析】中的「读者痛点」里选 1–2 个，用具体场景或矛盾写出开头。
- 目标是在前两三个自然段内，让读者产生「我被看见了 / 我被颠覆了 / 我不想吃亏」中的至少一种直觉反应。
- 开头提出的情绪钩子，后文必须通过分析和结论接住，不能变成标题党。

【看法张力：记忆点】
- 通篇至少围绕 1–3 个“看法张力”展开，例如：
  - 光鲜路径与隐藏代价；
  - 风口与清算并存；
  - 高收入与人生其它角色的损耗。
- 每个张力点都要：
  - 先把表面的冲突说清楚（哪里违背直觉）；
  - 再用事实/机制/案例把这个张力“圆回来”，形成自洽逻辑；
  - 最后落到可操作的启示或判断。

【建议结构】（可轻微调整）
1）开头：用具体痛点敲门（2–3 段）
2）现象与事实：有多少人卡在这里（2–3 段）
3）核心分析：张力背后的机制（3–5 个小节）
4）对个体和组织的启示（1–2 个小节）
5）收尾：回到开头的问题，给出清晰判断（1 段）

【长度要求】
- 正文整体控制在约 1000–1600 字之间。

【标题要求】
- 在正文之后输出 6–10 个备选标题。
- 每个标题都要同时体现：
  - 一个具体痛点（高薪代价、风口与清算、职业路径等）；
  - 至少一个“看法张力”（看起来赚到了，其实在亏；看起来安全，其实更危险）。
- 禁止使用“震惊”“崩溃”“赢麻了”等粗暴情绪词汇。
- 避免“洞察”“思考”“一点看法”等空洞词汇。

【输出格式】（务必严格遵守）
- 不要添加任何额外说明文字。
- 只能使用以下四个标签来分隔内容：
  [ARTICLE_START]、[ARTICLE_END]、[TITLE_START]、[TITLE_END]

请严格按照下面模板输出（照抄标签本身）：

[ARTICLE_START]
这里写完整正文，只用自然段，不要任何「开头：」「结尾：」之类的小标题。
[ARTICLE_END]

[TITLE_START]
在这里写 6-10 个标题，每行一个，不要编号，不要加“标题：”等前缀。
[TITLE_END]

【文章拆解分析】：
${analysisText}
      `;

      const fullText = await callLLM(prompt);
      const cleanedFullText = cleanText(fullText || '');

      // 通过标签解析正文和标题
      const articleMatch = cleanedFullText.match(
        /\[ARTICLE_START\]([\s\S]*?)\[ARTICLE_END\]/i
      );
      const titleMatch = cleanedFullText.match(
        /\[TITLE_START\]([\s\S]*?)\[TITLE_END\]/i
      );

      const article = articleMatch ? articleMatch[1].trim() : cleanedFullText.trim();
      const titles = titleMatch ? titleMatch[1].trim() : '生成标题失败';

      setGeneratedResult({
        article,
        titles,
      });
    } catch (err) {
      console.error(err);
      setError('生成请求失败，请检查网络或稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={{ flex: 1 }}>
          <h1 style={styles.logo}>
            RedNote <span style={styles.logoAccent}>Re-Creator</span>
          </h1>
          <p style={styles.subtitle}>深度二创工具：拆解逻辑 · 重构爆款</p>
        </div>

        {/* Quick Links Nav */}
        <div style={styles.navBar}>
          <span style={styles.navLabel}>素材源：</span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              style={activeCategory === cat.id ? styles.navButtonActive : styles.navButton}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Expandable Link Section */}
      {activeCategory && (
        <div style={styles.linkBar}>
          {quickLinks[activeCategory].map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.linkItem}
            >
              {link.title} ↗
            </a>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && <div style={styles.errorBar}>{error}</div>}

      {/* Main Grid */}
      <main style={styles.grid}>
        {/* Column 1: Source */}
        <section style={styles.column}>
          <div style={styles.columnHeader}>
            <span style={styles.stepNum}>1</span>
            <h3>粘贴原文</h3>
          </div>
          <textarea
            style={styles.textarea}
            placeholder="请在此粘贴行业优质长文..."
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
          />
          <div style={styles.actionArea}>
            <button
              style={isAnalyzing ? styles.buttonDisabled : styles.buttonPrimary}
              onClick={handleAnalyze}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? '正在深度拆解...' : '第一步：分析文章'}
            </button>
          </div>
        </section>

        {/* Column 2: Analysis (Editable) */}
        <section style={styles.column}>
          <div style={styles.columnHeader}>
            <span style={styles.stepNum}>2</span>
            <h3>策略与拆解 (可编辑)</h3>
          </div>
          <div style={styles.editorContainer}>
            <textarea
              style={{ ...styles.textarea, backgroundColor: '#fdfdfd', border: '1px dashed #ddd' }}
              placeholder="AI分析结果将显示在这里，您可以手动修改拆解思路，指导下一步生成..."
              value={analysisText}
              onChange={(e) => setAnalysisText(e.target.value)}
            />
          </div>
          <div style={styles.actionArea}>
            <button
              style={isGenerating ? styles.buttonDisabled : styles.buttonPrimary}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? '正在创作新稿...' : '第二步：生成新稿'}
            </button>
          </div>
        </section>

        {/* Column 3: Output */}
        <section style={styles.column}>
          <div style={styles.columnHeader}>
            <span style={styles.stepNum}>3</span>
            <h3>生成结果</h3>
          </div>

          <div style={styles.outputContainer}>
            <div style={styles.outputSection}>
              <h4 style={styles.subHeader}>新文章</h4>
              <textarea
                readOnly
                style={styles.outputTextarea}
                value={generatedResult.article}
                placeholder="等待生成..."
              />
            </div>

            <div style={{ ...styles.outputSection, marginTop: '20px' }}>
              <h4 style={styles.subHeader}>爆款标题库</h4>
              <textarea
                readOnly
                style={{
                  ...styles.outputTextarea,
                  color: '#333',
                  fontWeight: 500,
                  minHeight: '150px',
                }}
                value={generatedResult.titles}
                placeholder="等待生成..."
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#ffffff',
    color: '#333',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    padding: '10px 30px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    backgroundColor: '#fff',
    flexShrink: 0,
    justifyContent: 'space-between',
  },
  navBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  navLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: 600,
  },
  navButton: {
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    color: '#333',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  navButtonActive: {
    padding: '6px 16px',
    borderRadius: '20px',
    border: '1px solid #ff2442',
    backgroundColor: '#fff0f2',
    color: '#ff2442',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  linkBar: {
    backgroundColor: '#f9f9f9',
    borderBottom: '1px solid #eee',
    padding: '10px 30px',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    fontSize: '13px',
    flexShrink: 0,
  },
  linkItem: {
    color: '#555',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontWeight: 500,
    transition: 'color 0.2s',
  },
  logo: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 700,
    color: '#333',
  },
  logoAccent: {
    color: '#ff2442',
  },
  subtitle: {
    margin: 0,
    fontSize: '12px',
    color: '#888',
  },
  errorBar: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '10px 30px',
    fontSize: '14px',
    textAlign: 'center',
    flexShrink: 0,
  },
  grid: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '2px',
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  column: {
    backgroundColor: '#fff',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    height: '100%',
    overflowY: 'auto',
    boxSizing: 'border-box',
  },
  columnHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px',
    gap: '10px',
    flexShrink: 0,
  },
  stepNum: {
    background: '#333',
    color: '#fff',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  textarea: {
    width: '100%',
    height: '400px',
    minHeight: '150px',
    padding: '15px',
    border: '1px solid #eee',
    borderRadius: '8px',
    fontSize: '15px',
    lineHeight: '1.6',
    resize: 'vertical',
    outline: 'none',
    marginBottom: '15px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    color: '#333',
    backgroundColor: '#ffffff',
  },
  editorContainer: {
    width: '100%',
    marginBottom: '15px',
  },
  actionArea: {
    flexShrink: 0,
    paddingBottom: '20px',
  },
  buttonPrimary: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#ff2442',
    color: '#fff',
    border: 'none',
    borderRadius: '30px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  buttonDisabled: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#ccc',
    color: '#fff',
    border: 'none',
    borderRadius: '30px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  outputContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  outputSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  subHeader: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#666',
    fontWeight: 600,
  },
  outputTextarea: {
    width: '100%',
    height: '350px',
    minHeight: '150px',
    padding: '12px',
    backgroundColor: '#fafafa',
    border: '1px solid #eee',
    borderRadius: '6px',
    fontSize: '14px',
    lineHeight: '1.6',
    resize: 'vertical',
    outline: 'none',
    color: '#333',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
};

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
