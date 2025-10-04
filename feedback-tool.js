(function() {
  'use strict';

  // 既に読み込まれている場合は終了
  if (window.feedbackToolLoaded) {
    alert('修正指示ツールは既に起動しています');
    return;
  }
  window.feedbackToolLoaded = true;

  // 必要なライブラリを読み込み
  const libs = [
    { name: 'html2canvas', url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', check: () => window.html2canvas },
    { name: 'xlsx', url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', check: () => window.XLSX }
  ];

  let loadedCount = 0;
  
  libs.forEach(lib => {
    if (!lib.check()) {
      const script = document.createElement('script');
      script.src = lib.url;
      script.onload = () => {
        loadedCount++;
        if (loadedCount === libs.filter(l => !l.check()).length) {
          initFeedbackTool();
        }
      };
      document.head.appendChild(script);
    } else {
      initFeedbackTool();
    }
  });

  function initFeedbackTool() {
    // グローバル変数
    const feedbacks = loadFeedbacks();
    let isAddingMode = false;
    let pinCounter = feedbacks.length;

    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
      .feedback-tool-panel {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 15px;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        min-width: 280px;
        cursor: move;
      }
      .feedback-tool-panel h3 {
        margin: 0 0 15px 0;
        font-size: 16px;
        color: #333;
        border-bottom: 2px solid #007bff;
        padding-bottom: 8px;
      }
      .feedback-tool-btn {
        display: block;
        width: 100%;
        padding: 10px;
        margin: 8px 0;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        transition: all 0.2s;
      }
      .feedback-tool-btn-primary {
        background: #007bff;
        color: white;
      }
      .feedback-tool-btn-primary:hover {
        background: #0056b3;
      }
      .feedback-tool-btn-success {
        background: #28a745;
        color: white;
      }
      .feedback-tool-btn-success:hover {
        background: #1e7e34;
      }
      .feedback-tool-btn-warning {
        background: #ffc107;
        color: #333;
      }
      .feedback-tool-btn-warning:hover {
        background: #e0a800;
      }
      .feedback-tool-btn-danger {
        background: #dc3545;
        color: white;
      }
      .feedback-tool-btn-danger:hover {
        background: #c82333;
      }
      .feedback-tool-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .feedback-pin {
        position: absolute;
        width: 36px;
        height: 36px;
        background: #dc3545;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 16px;
        cursor: pointer;
        z-index: 999998;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 3px solid white;
        transition: transform 0.2s;
      }
      .feedback-pin:hover {
        transform: scale(1.1);
      }
      .feedback-pin::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 10px solid white;
      }
      .feedback-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999999;
      }
      .feedback-modal-content {
        background: white;
        border-radius: 8px;
        padding: 25px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
      }
      .feedback-modal-content h3 {
        margin: 0 0 20px 0;
        color: #333;
      }
      .feedback-form-group {
        margin-bottom: 15px;
      }
      .feedback-form-group label {
        display: block;
        margin-bottom: 5px;
        font-weight: 600;
        color: #555;
      }
      .feedback-form-group input,
      .feedback-form-group textarea,
      .feedback-form-group select {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
      }
      .feedback-form-group textarea {
        min-height: 100px;
        resize: vertical;
      }
      .feedback-modal-buttons {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }
      .feedback-modal-buttons button {
        flex: 1;
        padding: 10px;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-weight: 600;
      }
      .feedback-list {
        max-height: 200px;
        overflow-y: auto;
        margin: 10px 0;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .feedback-list-item {
        padding: 8px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
      }
      .feedback-list-item:last-child {
        border-bottom: none;
      }
      .feedback-list-item-info {
        flex: 1;
      }
      .feedback-list-item-actions {
        display: flex;
        gap: 5px;
      }
      .feedback-list-item-actions button {
        padding: 4px 8px;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        font-size: 11px;
      }
      .feedback-count {
        background: #dc3545;
        color: white;
        border-radius: 12px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: bold;
        display: inline-block;
        margin-left: 8px;
      }
      .feedback-adding-mode {
        background: #28a745 !important;
      }
    `;
    document.head.appendChild(style);

    // コントロールパネルを作成
    const panel = document.createElement('div');
    panel.className = 'feedback-tool-panel';
    panel.innerHTML = `
      <h3>📝 修正指示ツール</h3>
      <button class="feedback-tool-btn feedback-tool-btn-primary" id="toggleAddingMode">
        📍 指示モード開始
      </button>
      <button class="feedback-tool-btn feedback-tool-btn-success" id="exportExcel" ${feedbacks.length === 0 ? 'disabled' : ''}>
        📊 Excel出力 <span class="feedback-count">${feedbacks.length}</span>
      </button>
      <button class="feedback-tool-btn feedback-tool-btn-warning" id="saveFeedbacks" ${feedbacks.length === 0 ? 'disabled' : ''}>
        💾 一時保存
      </button>
      <button class="feedback-tool-btn feedback-tool-btn-danger" id="clearAll" ${feedbacks.length === 0 ? 'disabled' : ''}>
        🗑️ すべてクリア
      </button>
      <div class="feedback-list" id="feedbackList"></div>
      <button class="feedback-tool-btn" id="closePanel" style="background: #6c757d; color: white; margin-top: 10px;">
        ✕ 閉じる
      </button>
    `;
    document.body.appendChild(panel);

    // パネルのドラッグ機能
    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    panel.querySelector('h3').addEventListener('mousedown', dragStart);

    function dragStart(e) {
      initialX = e.clientX - panel.offsetLeft;
      initialY = e.clientY - panel.offsetTop;
      isDragging = true;
    }

    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        panel.style.left = currentX + 'px';
        panel.style.top = currentY + 'px';
        panel.style.right = 'auto';
      }
    }

    function dragEnd() {
      isDragging = false;
    }

    // 既存のピンを表示
    feedbacks.forEach((fb, index) => {
      createPin(fb.x, fb.y, index + 1, fb);
    });

    updateFeedbackList();

    // イベントリスナー
    document.getElementById('toggleAddingMode').addEventListener('click', () => {
      isAddingMode = !isAddingMode;
      const btn = document.getElementById('toggleAddingMode');
      if (isAddingMode) {
        btn.textContent = '⏸️ 指示モード停止';
        btn.classList.add('feedback-adding-mode');
        document.body.style.cursor = 'crosshair';
      } else {
        btn.textContent = '📍 指示モード開始';
        btn.classList.remove('feedback-adding-mode');
        document.body.style.cursor = 'default';
      }
    });

    document.getElementById('exportExcel').addEventListener('click', exportToExcel);
    document.getElementById('saveFeedbacks').addEventListener('click', saveFeedbacks);
    document.getElementById('clearAll').addEventListener('click', clearAll);
    document.getElementById('closePanel').addEventListener('click', () => {
      if (confirm('修正指示ツールを終了しますか?')) {
        panel.remove();
        document.querySelectorAll('.feedback-pin').forEach(pin => pin.remove());
        window.feedbackToolLoaded = false;
      }
    });

    // クリックイベント
    document.addEventListener('click', handleClick, true);

    function handleClick(e) {
      if (isAddingMode && !e.target.closest('.feedback-tool-panel') && !e.target.closest('.feedback-modal')) {
        e.preventDefault();
        e.stopPropagation();
        
        const x = e.pageX;
        const y = e.pageY;
        
        pinCounter++;
        const pin = createPin(x, y, pinCounter);
        
        showModal(pinCounter, x, y);
      }
    }

    function createPin(x, y, number, data = null) {
      const pin = document.createElement('div');
      pin.className = 'feedback-pin';
      pin.textContent = number;
      pin.style.left = (x - 18) + 'px';
      pin.style.top = (y - 18) + 'px';
      pin.dataset.number = number;
      
      pin.addEventListener('click', (e) => {
        e.stopPropagation();
        const fb = feedbacks.find(f => f.number === number);
        if (fb) {
          showModal(number, x, y, fb);
        }
      });
      
      document.body.appendChild(pin);
      return pin;
    }

    function showModal(number, x, y, existingData = null) {
      const modal = document.createElement('div');
      modal.className = 'feedback-modal';
      modal.innerHTML = `
        <div class="feedback-modal-content">
          <h3>${existingData ? '指示を編集' : '指示を追加'} - No.${number}</h3>
          <div class="feedback-form-group">
            <label>指示内容 *</label>
            <textarea id="feedbackComment" placeholder="修正内容を入力してください" required>${existingData ? existingData.comment : ''}</textarea>
          </div>
          <div class="feedback-form-group">
            <label>優先度</label>
            <select id="feedbackPriority">
              <option value="高" ${existingData && existingData.priority === '高' ? 'selected' : ''}>高</option>
              <option value="中" ${existingData && existingData.priority === '中' ? 'selected' : ''}>中</option>
              <option value="低" ${existingData && existingData.priority === '低' ? 'selected' : ''}>低</option>
            </select>
          </div>
          <div class="feedback-form-group">
            <label>カテゴリ</label>
            <select id="feedbackCategory">
              <option value="デザイン" ${existingData && existingData.category === 'デザイン' ? 'selected' : ''}>デザイン</option>
              <option value="テキスト" ${existingData && existingData.category === 'テキスト' ? 'selected' : ''}>テキスト</option>
              <option value="機能" ${existingData && existingData.category === '機能' ? 'selected' : ''}>機能</option>
              <option value="レイアウト" ${existingData && existingData.category === 'レイアウト' ? 'selected' : ''}>レイアウト</option>
              <option value="リンク" ${existingData && existingData.category === 'リンク' ? 'selected' : ''}>リンク</option>
              <option value="その他" ${existingData && existingData.category === 'その他' ? 'selected' : ''}>その他</option>
            </select>
          </div>
          <div class="feedback-modal-buttons">
            ${existingData ? '<button id="deleteFeedback" style="background: #dc3545; color: white;">削除</button>' : ''}
            <button id="cancelFeedback" style="background: #6c757d; color: white;">キャンセル</button>
            <button id="saveFeedback" style="background: #007bff; color: white;">保存</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });

      document.getElementById('cancelFeedback').addEventListener('click', closeModal);
      document.getElementById('saveFeedback').addEventListener('click', () => saveFeedback(number, x, y, existingData));
      
      if (existingData) {
        document.getElementById('deleteFeedback').addEventListener('click', () => deleteFeedback(number));
      }

      function closeModal() {
        modal.remove();
        if (!existingData) {
          const pin = document.querySelector(`.feedback-pin[data-number="${number}"]`);
          if (pin) pin.remove();
          pinCounter--;
        }
      }
    }

    async function saveFeedback(number, x, y, existingData) {
      const comment = document.getElementById('feedbackComment').value.trim();
      const priority = document.getElementById('feedbackPriority').value;
      const category = document.getElementById('feedbackCategory').value;

      if (!comment) {
        alert('指示内容を入力してください');
        return;
      }

      // スクリーンショットを取得
      const screenshot = await captureScreenshot();

      const feedback = {
        number,
        x,
        y,
        comment,
        priority,
        category,
        url: window.location.href,
        timestamp: new Date().toLocaleString('ja-JP'),
        screenshot
      };

      if (existingData) {
        const index = feedbacks.findIndex(f => f.number === number);
        feedbacks[index] = feedback;
      } else {
        feedbacks.push(feedback);
      }

      document.querySelector('.feedback-modal').remove();
      updateFeedbackList();
      updateButtons();
    }

    function deleteFeedback(number) {
      if (confirm('この指示を削除しますか?')) {
        const index = feedbacks.findIndex(f => f.number === number);
        feedbacks.splice(index, 1);
        
        const pin = document.querySelector(`.feedback-pin[data-number="${number}"]`);
        if (pin) pin.remove();
        
        document.querySelector('.feedback-modal').remove();
        updateFeedbackList();
        updateButtons();
      }
    }

    function updateFeedbackList() {
      const list = document.getElementById('feedbackList');
      if (feedbacks.length === 0) {
        list.innerHTML = '<div style="padding: 15px; text-align: center; color: #999;">指示がありません</div>';
      } else {
        list.innerHTML = feedbacks.map(fb => `
          <div class="feedback-list-item">
            <div class="feedback-list-item-info">
              <strong>No.${fb.number}</strong> [${fb.priority}] ${fb.category}<br>
              <small>${fb.comment.substring(0, 30)}${fb.comment.length > 30 ? '...' : ''}</small>
            </div>
          </div>
        `).join('');
      }
    }

    function updateButtons() {
      const hasData = feedbacks.length > 0;
      document.getElementById('exportExcel').disabled = !hasData;
      document.getElementById('saveFeedbacks').disabled = !hasData;
      document.getElementById('clearAll').disabled = !hasData;
      
      const countBadge = document.querySelector('.feedback-count');
      if (countBadge) {
        countBadge.textContent = feedbacks.length;
      }
    }

    async function captureScreenshot() {
      try {
        const canvas = await html2canvas(document.body, {
          allowTaint: true,
          useCORS: true,
          scrollY: -window.scrollY,
          scrollX: -window.scrollX,
          windowWidth: document.documentElement.scrollWidth,
          windowHeight: document.documentElement.scrollHeight
        });
        return canvas.toDataURL('image/png');
      } catch (error) {
        console.error('スクリーンショット取得エラー:', error);
        return null;
      }
    }

    function exportToExcel() {
      if (feedbacks.length === 0) {
        alert('エクスポートする指示がありません');
        return;
      }

      const wb = XLSX.utils.book_new();
      
      // データを整形
      const data = feedbacks.map(fb => ({
        'No.': fb.number,
        'ページURL': fb.url,
        '指示内容': fb.comment,
        '優先度': fb.priority,
        'カテゴリ': fb.category,
        '作成日時': fb.timestamp
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      
      // 列幅を調整
      ws['!cols'] = [
        { wch: 5 },
        { wch: 50 },
        { wch: 60 },
        { wch: 8 },
        { wch: 12 },
        { wch: 20 }
      ];

      XLSX.utils.book_append_sheet(wb, ws, '修正指示一覧');

      // ファイル名を生成
      const filename = `修正指示書_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      XLSX.writeFile(wb, filename);
      
      alert(`${feedbacks.length}件の指示をExcelファイルとして出力しました`);
    }

    function saveFeedbacks() {
      const data = {
        url: window.location.href,
        feedbacks: feedbacks
      };
      localStorage.setItem('feedbackTool_' + window.location.pathname, JSON.stringify(data));
      alert('指示を一時保存しました');
    }

    function loadFeedbacks() {
      try {
        const saved = localStorage.getItem('feedbackTool_' + window.location.pathname);
        if (saved) {
          const data = JSON.parse(saved);
          return data.feedbacks || [];
        }
      } catch (e) {
        console.error('読み込みエラー:', e);
      }
      return [];
    }

    function clearAll() {
      if (confirm('すべての指示を削除しますか?')) {
        feedbacks.length = 0;
        pinCounter = 0;
        document.querySelectorAll('.feedback-pin').forEach(pin => pin.remove());
        localStorage.removeItem('feedbackTool_' + window.location.pathname);
        updateFeedbackList();
        updateButtons();
      }
    }
  }
})();