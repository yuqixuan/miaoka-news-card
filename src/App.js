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

// 高亮数字的函数
function highlightNumbers(text) {
  // 匹配整数、小数、百分比等
  return text.replace(
    /(\d+[\d,.]*%?)/g,
    '<span class="highlight-number">$1</span>'
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

function App() {
  const [rawInput, setRawInput] = useState(
    `1. 新闻标题一\n内容一内容一内容一\n\n2. 新闻标题二\n内容二内容二内容二\n\n3. 新闻标题三\n内容三内容三内容三\n\n4. 新闻标题四\n内容四内容四内容四\n\n5. 新闻标题五\n内容五内容五内容五\n\n6. 新闻标题六\n内容六内容六内容六\n\n7. 新闻标题七\n内容七内容七内容七\n\n8. 新闻标题八\n内容八内容八内容八\n\n9. 新闻标题九\n内容九内容九内容九\n\n10. 新闻标题十\n内容十内容十内容十\n\n简评：这里是简评内容`
  );
  const [date, setDate] = useState(getTomorrowDateStr());
  const [footer, setFooter] = useState("今日信息差");
  const cardRefs = useRef([]);

  const { newsList, comment } = parseNewsAndComment(rawInput);

  const exportAllCards = async () => {
    const zip = new JSZip();
    let hasImage = false;
    // 新闻卡片
    for (let i = 0; i < newsList.length; i++) {
      const ref = cardRefs.current[i];
      if (ref) {
        const canvas = await html2canvas(ref, {
          backgroundColor: null,
          scale: 2,
        });
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
        const canvas = await html2canvas(ref, {
          backgroundColor: null,
          scale: 2,
        });
        const dataUrl = canvas.toDataURL("image/png");
        const imgData = dataUrl.split(",")[1];
        zip.file(`card-comment.png`, imgData, { base64: true });
        hasImage = true;
      }
    }
    if (hasImage) {
      zip.generateAsync({ type: "blob" }).then((content) => {
        saveAs(content, "cards.zip");
      });
    } else {
      alert("没有可导出的卡片图片！");
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
        <button className="export-btn" onClick={exportAllCards}>
          一键导出全部卡片图片
        </button>
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
            <div
              className="card-content"
              dangerouslySetInnerHTML={{
                __html: highlightNumbers(item.content),
              }}
            ></div>
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
            <div
              className="card-content"
              dangerouslySetInnerHTML={{ __html: highlightNumbers(comment) }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
