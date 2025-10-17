(function() {
  // スタイルを作成
  const style = document.createElement('style');
  style.textContent = `
    #h1-extractor-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #h1-extractor-content {
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    #h1-extractor-content h2 {
      margin: 0 0 16px 0;
      font-size: 24px;
      color: #333;
    }
    #h1-extractor-content textarea {
      width: 100%;
      height: 120px;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      font-family: monospace;
      resize: vertical;
      box-sizing: border-box;
    }
    #h1-extractor-content button {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin: 8px 8px 8px 0;
    }
    .h1-btn-primary {
      background: #4f46e5;
      color: white;
    }
    .h1-btn-primary:hover {
      background: #4338ca;
    }
    .h1-btn-secondary {
      background: #10b981;
      color: white;
    }
    .h1-btn-secondary:hover {
      background: #059669;
    }
    .h1-btn-close {
      background: #ef4444;
      color: white;
    }
    .h1-btn-close:hover {
      background: #dc2626;
    }
    #h1-results {
      margin-top: 16px;
    }
    .h1-result-item {
      padding: 12px;
      margin: 8px 0;
      border-radius: 8px;
      border: 2px solid #ddd;
    }
    .h1-result-success {
      background: #f0fdf4;
      border-color: #86efac;
    }
    .h1-result-error {
      background: #fef2f2;
      border-color: #fca5a5;
    }
    .h1-result-url {
      font-size: 12px;
      color: #666;
      word-break: break-all;
      margin-bottom: 8px;
    }
    .h1-result-text {
      font-weight: 600;
      color: #333;
      margin: 4px 0;
    }
    .h1-result-error-text {
      color: #dc2626;
      font-size: 14px;
    }
    .h1-loading {
      color: #4f46e5;
      font-weight: 600;
      margin-top: 12px;
    }
  `;
  document.head.appendChild(style);

  // モーダルを作成
  const modal = document.createElement('div');
  modal.id = 'h1-extractor-modal';
  modal.innerHTML = `
    <div id="h1-extractor-content">
      <h2>🔍 H1テキスト一括取得</h2>
      <p style="color: #666; margin-bottom: 16px;">URLを1行ずつ入力してください</p>
      <textarea id="h1-urls" placeholder="https://example.com&#10;https://example.org"></textarea>
      <div>
        <button class="h1-btn-primary" id="h1-extract-btn">抽出開始</button>
        <button class="h1-btn-secondary" id="h1-download-btn" style="display:none;">CSV出力</button>
        <button class="h1-btn-close" id="h1-close-btn">閉じる</button>
      </div>
      <div id="h1-results"></div>
    </div>
  `;
  document.body.appendChild(modal);

  let results = [];

  // 閉じるボタン
  document.getElementById('h1-close-btn').onclick = function() {
    modal.remove();
    style.remove();
  };

  // 背景クリックで閉じる
  modal.onclick = function(e) {
    if (e.target === modal) {
      modal.remove();
      style.remove();
    }
  };

  // H1抽出関数
  async function extractH1(url) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const h1Elements = doc.querySelectorAll('h1');
      
      // textContentで全テキストを取得（子要素含む）し、余分な空白を削除
      const h1Texts = Array.from(h1Elements).map(h1 => {
        return h1.textContent.replace(/\s+/g, ' ').trim();
      }).filter(t => t);
      
      return {
        url,
        success: true,
        h1Texts: h1Texts.length > 0 ? h1Texts : ['H1タグが見つかりませんでした']
      };
    } catch (error) {
      return {
        url,
        success: false,
        error: error.message
      };
    }
  }

  // 抽出開始
  document.getElementById('h1-extract-btn').onclick = async function() {
    const urls = document.getElementById('h1-urls').value
      .split('\n')
      .map(u => u.trim())
      .filter(u => u);

    if (urls.length === 0) {
      alert('URLを入力してください');
      return;
    }

    const resultsDiv = document.getElementById('h1-results');
    resultsDiv.innerHTML = '<div class="h1-loading">抽出中...</div>';
    results = [];

    for (const url of urls) {
      const result = await extractH1(url);
      results.push(result);
      
      const resultHTML = result.success
        ? `<div class="h1-result-item h1-result-success">
             <div class="h1-result-url">${result.url}</div>
             ${result.h1Texts.map(h1 => `<div class="h1-result-text">${h1}</div>`).join('')}
           </div>`
        : `<div class="h1-result-item h1-result-error">
             <div class="h1-result-url">${result.url}</div>
             <div class="h1-result-error-text">エラー: ${result.error}</div>
           </div>`;
      
      resultsDiv.innerHTML += resultHTML;
    }

    resultsDiv.querySelector('.h1-loading')?.remove();
    document.getElementById('h1-download-btn').style.display = 'inline-block';
  };

  // CSV出力
  document.getElementById('h1-download-btn').onclick = function() {
    const csv = [
      ['URL', 'ステータス', 'H1テキスト'],
      ...results.map(r => [
        r.url,
        r.success ? '成功' : '失敗',
        r.success ? r.h1Texts.join(' | ') : r.error
      ])
    ]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `h1_extraction_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
})();