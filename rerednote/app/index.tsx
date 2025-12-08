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

// Helper to remove markdown bold syntax
const cleanText = (text: string): string => {
  if (!text) return '';
  // Global replace for **
  return text.replace(/\*\*/g, '');
};

const App: React.FC = () => {
  // State Management
  const [sourceText, setSourceText] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [generatedResult, setGeneratedResult] = useState<{ article: string; titles: string }>({
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
        你是一位资深的小红书内容策略专家。请深度拆解用户提供的这篇文章。
        
        【最高指令】：输出的文案中严禁包含 "**" 符号！不要使用Markdown加粗格式！
        
        你的目标是提取文章的核心逻辑，以便进行二次创作。请输出以下结构（保持清晰简洁）：

        1. 核心情绪与人群：文章针对谁？引发了什么情绪（焦虑/共鸣/爽感）？
        2. 核心观点链：用3-5个简练的要点概括文章逻辑。
        3. 结构拆解：
           - 开头钩子是什么？
           - 中间是如何层层递进的？
           - 结尾是如何升华或互动的？
        4. 亮点元素：原文有哪些精彩的比喻、金句或场景（列举即可）。
        5. 二创切入点：如果不照搬原文，可以从哪3个新的角度切入重写？

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
        你是一位拥有百万粉丝的小红书博主。请根据提供的【文章拆解分析】，写一篇全新的爆款笔记。

        【最高指令】：输出的文案中严禁包含 "**" 符号！不要使用Markdown加粗格式！

        **【写作要求】**：
        1. **语气风格**：第一人称，真实、接地气、有网感。可以稍微犀利一点，或者温暖治愈。拒绝由于、爹味、AI味。
        2. **排版格式**：多用短句，段落之间必须空行，适当使用Emoji。
        3. **内容结构**：
           - **开头**：必须用强烈的冲突、悬念或共鸣切入，吸引点击。
           - **正文**：不要照搬原文！将原文的逻辑用新的生活化案例、比喻重新演绎。
           - **结尾**：给出清晰的行动建议或互动提问。
        4. **字数**：600-800字左右。

        **【输出格式】**：
        请严格按照以下格式输出：
        [正文内容]
        
        ===TITLES===
        
        [8-10个备选爆款标题，每行一个]

        **【输入分析】**：
        ${analysisText}
      `;

      const fullText = await callLLM(prompt);
      const cleanedFullText = cleanText(fullText || '');
      const parts = cleanedFullText.split('===TITLES===');

      setGeneratedResult({
        article: parts[0]?.trim() || cleanedFullText,
        titles: parts[1]?.trim() || '生成标题失败',
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
                  fontWeight: '500',
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
    borderBottom: '1px solid '#eee',
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
    border: '1px solid '#eee',
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
