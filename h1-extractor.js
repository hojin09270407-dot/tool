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
      max-width: 700px;
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
    #h1-extractor-content button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .h1-btn-primary {
      background: #4f46e5;
      color: white;
    }
    .h1-btn-primary:hover:not(:disabled) {
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
    .h1-result-loading {
      background: #fef3c7;
      border-color: #fcd34d;
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
    .h1-loading-text {
      color: #d97706;
      font-size: 14px;
    }
    .h1-info-box {
      background: #eff6ff;
      border: 2px solid #93c5fd;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #1e40af;
    }
    #h1-hidden-iframe {
      position: fixed;
      top: -9999px;
      left: -9999px;
      width: 1px;
      height: 1px;
    }
  `;
  document.head.appendChild(style);

  // モーダルを作成
  const modal = document.createElement('div');
  modal.id = 'h1-extractor-modal';
  modal.innerHTML = `
    <div id="h1-extractor-content">
      <h2>🔍 H1テキスト一括取得（SPA対応）</h2>
      <div class="h1-info-box">
        <strong>📌 使い方:</strong><br>
        URLを入力して「抽出開始」をクリックすると、各ページを自動で読み込んでH1を取得します。<br>
        <small>※ iframeで読み込むため、数秒〜10秒程度かかります</small>
      </div>
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
  let isExtracting = false;

  // 閉じるボタン
  document.getElementById('h1-close-btn').onclick = function() {
    modal.remove();
    style.remove();
    const iframe = document.getElementById('h1-hidden-iframe');
    if (iframe) iframe.remove();
  };

  // 背景クリックで閉じる
  modal.onclick = function(e) {
    if (e.target === modal && !isExtracting) {
      modal.remove();
      style.remove();
      const iframe = document.getElementById('h1-hidden-iframe');
      if (iframe) iframe.remove();
    }
  };

  // iframeでページを読み込んでH1を取得
  function extractH1FromIframe(url, timeout = 10000) {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.id = 'h1-hidden-iframe';
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
      
      let timeoutId;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (iframe.parentNode) iframe.remove();
      };

      const resolveOnce = (result) => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(result);
        }
      };

      // タイムアウト設定
      timeoutId = setTimeout(() => {
        try {
          const h1Elements = iframe.contentDocument?.querySelectorAll('h1');
          if (h1Elements && h1Elements.length > 0) {
            const h1Texts = Array.from(h1Elements).map(h1 => 
              h1.textContent.replace(/\s+/g, ' ').trim()
            ).filter(t => t);
            resolveOnce({
              url,
              success: true,
              h1Texts: h1Texts.length > 0 ? h1Texts : ['H1タグが見つかりませんでした']
            });
          } else {
            resolveOnce({
              url,
              success: false,
              error: 'タイムアウト：ページの読み込みに時間がかかりすぎました'
            });
          }
        } catch (e) {
          resolveOnce({
            url,
            success: false,
            error: 'タイムアウト：' + e.message
          });
        }
      }, timeout);

      iframe.onload = function() {
        // 追加で2秒待ってJavaScriptの実行を待つ
        setTimeout(() => {
          try {
            const h1Elements = iframe.contentDocument.querySelectorAll('h1');
            const h1Texts = Array.from(h1Elements).map(h1 => 
              h1.textContent.replace(/\s+/g, ' ').trim()
            ).filter(t => t);
            
            resolveOnce({
              url,
              success: true,
              h1Texts: h1Texts.length > 0 ? h1Texts : ['H1タグが見つかりませんでした']
            });
          } catch (e) {
            resolveOnce({
              url,
              success: false,
              error: 'クロスオリジン制限: ' + e.message
            });
          }
        }, 2000);
      };

      iframe.onerror = function() {
        resolveOnce({
          url,
          success: false,
          error: 'ページの読み込みに失敗しました'
        });
      };

      document.body.appendChild(iframe);
      iframe.src = url;
    });
  }

  // 抽出開始
  document.getElementById('h1-extract-btn').onclick = async function() {
    const urls = document.getElementById('h1-urls').value
      .split('\n')
      .map(u => u.trim())
      .filter(u => u && u.startsWith('http'));

    if (urls.length === 0) {
      alert('URLを入力してください（http:// または https:// で始まる必要があります）');
      return;
    }

    isExtracting = true;
    const extractBtn = document.getElementById('h1-extract-btn');
    extractBtn.disabled = true;
    extractBtn.textContent = '抽出中...';

    const resultsDiv = document.getElementById('h1-results');
    resultsDiv.innerHTML = '';
    results = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      // 読み込み中表示
      const loadingHTML = `<div class="h1-result-item h1-result-loading" id="result-${i}">
           <div class="h1-result-url">${url}</div>
           <div class="h1-loading-text">⏳ 読み込み中... (${i + 1}/${urls.length})</div>
         </div>`;
      resultsDiv.innerHTML += loadingHTML;

      // H1を抽出
      const result = await extractH1FromIframe(url);
      results.push(result);
      
      // 結果を更新
      const resultHTML = result.success
        ? `<div class="h1-result-item h1-result-success">
             <div class="h1-result-url">${result.url}</div>
             ${result.h1Texts.map(h1 => `<div class="h1-result-text">${h1}</div>`).join('')}
           </div>`
        : `<div class="h1-result-item h1-result-error">
             <div class="h1-result-url">${result.url}</div>
             <div class="h1-result-error-text">エラー: ${result.error}</div>
           </div>`;
      
      document.getElementById(`result-${i}`).outerHTML = resultHTML;
    }

    extractBtn.disabled = false;
    extractBtn.textContent = '抽出開始';
    isExtracting = false;
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