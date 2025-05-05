import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
// import domtoimage from "dom-to-image-more";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "./App.css";

function parseNewsAndComment(raw) {
  // 匹配 1. 标题\n内容 ... 10. 标题\n内容
  const newsRegex = /\n?(\d+)\.\s*(.+?)\n([\s\S]*?)(?=(\n\d+\.|\n简评：|$))/g;
  let match;
  const newsList = [];
  let comment = "";
  while ((match = newsRegex.exec(raw))) {
    newsList.push({
      title: match[2].trim(),
      content: match[3].trim(),
    });
  }
  // 提取简评
  const commentMatch = raw.match(/简评：([\s\S]*)/);
  if (commentMatch) {
    comment = commentMatch[1].trim();
  }
  return { newsList, comment };
}

// SVG渐变数字组件
function GradientNumber({ children }) {
  const text = String(children);
  const fontSize = 15.5;
  // 缩小宽度系数，避免多位数字间距过大
  const width = text.length * fontSize * 0.62 + 2;
  return (
    <svg
      width={width}
      height={fontSize + 6}
      style={{ verticalAlign: "-6px", margin: "0 -1px" }}
    >
      <defs>
        <linearGradient id="num-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fc575e" />
          <stop offset="100%" stopColor="#f7b42c" />
        </linearGradient>
      </defs>
      <text
        x="1"
        y={fontSize}
        fontFamily="inherit"
        fontWeight="bold"
        fontSize={fontSize}
        fill="url(#num-gradient)"
        alignmentBaseline="baseline"
        dominantBaseline="baseline"
      >
        {text}
      </text>
    </svg>
  );
}

// 高亮数字的函数，返回 React 片段
function renderWithHighlight(text) {
  const parts = text.split(/(\d+[\d,.]*%?)/g);
  return parts.map((part, idx) =>
    /^\d+[\d,.]*%?$/.test(part) ? (
      <span key={idx} style={{ color: "#fc575e", fontWeight: "bold" }}>
        {part}
      </span>
    ) : (
      part
    )
  );
}

function getTomorrowDateStr() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = tomorrow.getMonth() + 1;
  const d = tomorrow.getDate();
  return `${y}年${m}月${d}日`;
}

// 只将括号内包含"来源"二字的内容（中英文括号均可）单独放到下一行，并用英文括号包裹
function splitParenthesesToNewLine(text) {
  // 匹配 (来源...) 或 （来源...）
  return text
    .replace(/\(([^)]*来源[^)]*)\)/g, "\n($1)")
    .replace(/（([^）]*来源[^）]*)）/g, "\n($1)");
}

// 渲染内容时将括号内含"来源"的内容单独渲染为 source-line
function renderContentWithSource(text) {
  // 先用正则分割出"来源"括号内容
  const regex = /([\(（][^\)）]*来源[^\)）]*[\)）])/g;
  const parts = [];
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) {
      parts.push({ type: "normal", text: text.slice(lastIndex, match.index) });
    }
    // 只保留括号内内容，统一英文括号
    const inner = match[0].replace(/[\(（]([^\)）]*来源[^\)）]*)[\)）]/, "$1");
    parts.push({ type: "source", text: `(${inner})` });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "normal", text: text.slice(lastIndex) });
  }
  // 渲染
  return parts.map((part, idx) =>
    part.type === "source"
      ? [
          <br key={idx + "br"} />,
          <span key={idx} className="source-line">
            {part.text}
          </span>,
        ]
      : renderWithHighlight(part.text)
  );
}

function App() {
  const [rawInput, setRawInput] = useState(
    `1. 新闻标题一\n内容一内容一内容一\n\n2. 新闻标题二\n内容二内容二内容二\n\n3. 新闻标题三\n内容三内容三内容三\n\n4. 新闻标题四\n内容四内容四内容四\n\n5. 新闻标题五\n内容五内容五内容五\n\n6. 新闻标题六\n内容六内容六内容六\n\n7. 新闻标题七\n内容七内容七内容七\n\n8. 新闻标题八\n内容八内容八内容八\n\n9. 新闻标题九\n内容九内容九内容九\n\n10. 新闻标题十\n内容十内容十内容十\n\n简评：这里是简评内容`
  );
  const [date, setDate] = useState(getTomorrowDateStr());
  const [footer, setFooter] = useState("今日信息差");
  const cardRefs = useRef([]);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const { newsList, comment } = parseNewsAndComment(rawInput);

  const exportAllCards = async () => {
    setExporting(true);
    setExportSuccess(false);
    const zip = new JSZip();
    let hasImage = false;
    const scale = window.devicePixelRatio || 2;
    // 新闻卡片
    for (let i = 0; i < newsList.length; i++) {
      const ref = cardRefs.current[i];
      if (ref) {
        const canvas = await html2canvas(ref, { backgroundColor: null, scale });
        const dataUrl = canvas.toDataURL("image/png");
        const imgData = dataUrl.split(",")[1];
        zip.file(`card-${i + 1}.png`, imgData, { base64: true });
        hasImage = true;
        await new Promise((res) => setTimeout(res, 100));
      }
    }
    // 简评卡片
    if (comment) {
      const ref = cardRefs.current[newsList.length];
      if (ref) {
        const canvas = await html2canvas(ref, { backgroundColor: null, scale });
        const dataUrl = canvas.toDataURL("image/png");
        const imgData = dataUrl.split(",")[1];
        zip.file(`card-comment.png`, imgData, { base64: true });
        hasImage = true;
      }
    }
    if (hasImage) {
      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, "cards.zip");
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 2000);
        setExporting(false);
      });
    } else {
      alert("没有可导出的卡片图片！");
      setExporting(false);
    }
  };

  return (
    <div className="main-bg">
      <div className="input-panel">
        <div className="input-group">
          <label>日期：</label>
          <input value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="input-group">
          <label>底部内容：</label>
          <input value={footer} onChange={(e) => setFooter(e.target.value)} />
        </div>
        <div className="input-group">
          <label>新闻内容：</label>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            rows={18}
            placeholder={"请按格式输入新闻内容..."}
          />
        </div>
        <button
          className="export-btn"
          onClick={exportAllCards}
          disabled={exporting}
        >
          {exporting ? "正在导出..." : "一键导出全部卡片图片"}
        </button>
        {exportSuccess && (
          <div className="export-success">导出成功！已保存为 cards.zip</div>
        )}
      </div>
      <div
        className="card-preview-wrapper"
        style={{ flexWrap: "wrap", gap: 24 }}
      >
        {newsList.map((item, idx) => (
          <div
            className="card-preview"
            key={idx}
            ref={(el) => (cardRefs.current[idx] = el)}
          >
            <div className="card-header">
              <span>{date}</span>
            </div>
            <div className="card-title">{item.title}</div>
            <div className="card-content">
              {renderContentWithSource(item.content)}
            </div>
          </div>
        ))}
        {comment && (
          <div
            className="card-preview"
            ref={(el) => (cardRefs.current[newsList.length] = el)}
          >
            <div className="card-header">
              <span>{date}</span>
            </div>
            <div className="card-title">简评</div>
            <div className="card-content">
              {renderContentWithSource(comment)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
