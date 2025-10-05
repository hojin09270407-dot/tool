(function() {
  'use strict';

  // URLパラメータから共有データを確認
  const urlParams = new URLSearchParams(window.location.search);
  const sharedData = urlParams.get('feedback');
  
  if (sharedData) {
    // 共有モードで起動
    loadSharedFeedback(sharedData);
    return;
  }

  if (window.feedbackToolLoaded) {
    alert('修正指示ツールは既に起動しています');
    return;
  }
  window.feedbackToolLoaded = true;

  initFeedbackTool();

  function loadSharedFeedback(encodedData) {
    try {
      const jsonData = atob(decodeURIComponent(encodedData));
      const feedbacks = JSON.parse(jsonData);
      
      // スタイルを追加
      addStyles();
      
      // 共有モード用パネルを作成
      const panel = document.createElement('div');
      panel.className = 'feedback-tool-panel';
      panel.innerHTML = `
        <h3>📋 修正指示 (閲覧モード)</h3>
        <div style="background: #e3f2fd; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 13px;">
          <strong>${feedbacks.length}件</strong>の指示があります
        </div>
        <div class="feedback-list" id="feedbackList"></div>
        <button class="feedback-tool-btn" id="closePanel" style="background: #6c757d; color: white; margin-top: 10px;">
          ✕ 閉じる
        </button>
      `;
      document.body.appendChild(panel);
      
      // 矩形とラベルを表示
      feedbacks.forEach(fb => {
        const rect = document.createElement('div');
        rect.className = 'feedback-rect';
        rect.style.left = fb.rect.left + 'px';
        rect.style.top = fb.rect.top + 'px';
        rect.style.width = fb.rect.width + 'px';
        rect.style.height = fb.rect.height + 'px';
        rect.style.pointerEvents = 'auto';
        
        const label = document.createElement('div');
        label.className = 'feedback-rect-label';
        label.textContent = fb.number;
        rect.appendChild(label);
        
        document.body.appendChild(rect);
        
        // クリックで詳細表示
        label.addEventListener('click', () => {
          showSharedBalloon(fb);
        });
      });
      
      // リスト表示
      const list = document.getElementById('feedbackList');
      list.innerHTML = feedbacks.map(fb => `
        <div class="feedback-list-item" style="cursor: pointer;" data-number="${fb.number}">
          <strong>No.${fb.number}</strong> [${fb.priority}] ${fb.category}<br>
          <small>${fb.comment.substring(0, 30)}${fb.comment.length > 30 ? '...' : ''}</small>
        </div>
      `).join('');
      
      // リストアイテムクリックで詳細表示
      document.querySelectorAll('.feedback-list-item').forEach(item => {
        item.addEventListener('click', () => {
          const number = parseInt(item.dataset.number);
          const fb = feedbacks.find(f => f.number === number);
          if (fb) {
            showSharedBalloon(fb);
            // 矩形までスクロール
            const rect = document.querySelector(`.feedback-rect [data-number="${number}"]`)?.parentElement;
            if (rect) {
              rect.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        });
      });
      
      document.getElementById('closePanel').addEventListener('click', () => {
        panel.remove();
        document.querySelectorAll('.feedback-rect, .feedback-balloon').forEach(el => el.remove());
      });
      
    } catch (error) {
      console.error('共有データの読み込みに失敗:', error);
      alert('共有URLが無効です');
    }
  }

  function showSharedBalloon(fb) {
    // 既存の吹き出しを削除
    const existing = document.querySelector('.feedback-balloon');
    if (existing) existing.remove();
    
    const balloon = document.createElement('div');
    balloon.className = 'feedback-balloon';
    balloon.style.left = (fb.rect.left + fb.rect.width + 20) + 'px';
    balloon.style.top = fb.rect.top + 'px';
    
    balloon.innerHTML = `
      <h4>📝 指示 No.${fb.number}</h4>
      <div class="feedback-balloon-group">
        <label>指示内容</label>
        <div style="padding: 8px; background: #f8f9fa; border-radius: 4px; white-space: pre-wrap;">${fb.comment}</div>
      </div>
      <div class="feedback-balloon-group">
        <label>優先度</label>
        <div style="padding: 8px; background: #f8f9fa; border-radius: 4px;"><strong>${fb.priority}</strong></div>
      </div>
      <div class="feedback-balloon-group">
        <label>カテゴリ</label>
        <div style="padding: 8px; background: #f8f9fa; border-radius: 4px;">${fb.category}</div>
      </div>
      <div style="font-size: 11px; color: #999; margin-top: 8px;">作成: ${fb.timestamp}</div>
      <div class="feedback-balloon-buttons">
        <button id="balloonClose" style="background: #6c757d; color: white; width: 100%;">閉じる</button>
      </div>
    `;
    
    document.body.appendChild(balloon);
    
    document.getElementById('balloonClose').addEventListener('click', () => {
      balloon.remove();
    });
  }

  function initFeedbackTool() {
    const feedbacks = [];
    let isAddingMode = false;
    let isDragging = false;
    let startX, startY, currentRect;
    let rectCounter = 0;

    // スタイルを追加
    addStyles();

    // コントロールパネルを作成
    const panel = document.createElement('div');
    panel.className = 'feedback-tool-panel';
    panel.innerHTML = `
      <h3>📝 修正指示ツール</h3>
      <button class="feedback-tool-btn feedback-tool-btn-primary" id="toggleAddingMode">
        🖱️ 範囲指定モード開始
      </button>
      <button class="feedback-tool-btn feedback-tool-btn-success" id="shareUrl" ${feedbacks.length === 0 ? 'disabled' : ''}>
        📤 共有URL生成 <span class="feedback-count">${feedbacks.length}</span>
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
    let isPanelDragging = false;
    let panelCurrentX, panelCurrentY, panelInitialX, panelInitialY;

    panel.querySelector('h3').addEventListener('mousedown', panelDragStart);

    function panelDragStart(e) {
      panelInitialX = e.clientX - panel.offsetLeft;
      panelInitialY = e.clientY - panel.offsetTop;
      isPanelDragging = true;
    }

    document.addEventListener('mousemove', panelDrag);
    document.addEventListener('mouseup', panelDragEnd);

    function panelDrag(e) {
      if (isPanelDragging) {
        e.preventDefault();
        panelCurrentX = e.clientX - panelInitialX;
        panelCurrentY = e.clientY - panelInitialY;
        panel.style.left = panelCurrentX + 'px';
        panel.style.top = panelCurrentY + 'px';
        panel.style.right = 'auto';
      }
    }

    function panelDragEnd() {
      isPanelDragging = false;
    }

    updateFeedbackList();

    // イベントリスナー
    document.getElementById('toggleAddingMode').addEventListener('click', () => {
      isAddingMode = !isAddingMode;
      const btn = document.getElementById('toggleAddingMode');
      if (isAddingMode) {
        btn.textContent = '⏸️ 範囲指定モード停止';
        btn.classList.add('feedback-adding-mode');
        document.body.style.cursor = 'crosshair';
      } else {
        btn.textContent = '🖱️ 範囲指定モード開始';
        btn.classList.remove('feedback-adding-mode');
        document.body.style.cursor = 'default';
      }
    });

    document.getElementById('shareUrl').addEventListener('click', generateShareUrl);
    document.getElementById('clearAll').addEventListener('click', clearAll);
    document.getElementById('closePanel').addEventListener('click', () => {
      if (confirm('修正指示ツールを終了しますか?')) {
        panel.remove();
        document.querySelectorAll('.feedback-rect, .feedback-balloon').forEach(el => el.remove());
        window.feedbackToolLoaded = false;
      }
    });

    // ドラッグイベント
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mouseup', handleMouseUp, true);

    function handleMouseDown(e) {
      if (!isAddingMode || e.target.closest('.feedback-tool-panel') || e.target.closest('.feedback-balloon')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      isDragging = true;
      startX = e.pageX;
      startY = e.pageY;
      
      currentRect = document.createElement('div');
      currentRect.className = 'feedback-rect';
      currentRect.style.left = startX + 'px';
      currentRect.style.top = startY + 'px';
      currentRect.style.width = '0px';
      currentRect.style.height = '0px';
      document.body.appendChild(currentRect);
    }

    function handleMouseMove(e) {
      if (!isDragging) return;
      
      e.preventDefault();
      
      const currentX = e.pageX;
      const currentY = e.pageY;
      
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      
      currentRect.style.left = left + 'px';
      currentRect.style.top = top + 'px';
      currentRect.style.width = width + 'px';
      currentRect.style.height = height + 'px';
    }

    function handleMouseUp(e) {
      if (!isDragging) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      isDragging = false;
      
      const rect = currentRect.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) {
        currentRect.remove();
        return;
      }
      
      rectCounter++;
      const rectData = {
        number: rectCounter,
        left: parseInt(currentRect.style.left),
        top: parseInt(currentRect.style.top),
        width: parseInt(currentRect.style.width),
        height: parseInt(currentRect.style.height)
      };
      
      // ラベルを追加
      const label = document.createElement('div');
      label.className = 'feedback-rect-label';
      label.textContent = rectCounter;
      label.dataset.number = rectCounter;
      currentRect.appendChild(label);
      currentRect.style.pointerEvents = 'auto';
      currentRect.dataset.number = rectCounter;
      
      // 吹き出しを表示
      showBalloon(rectData);
      
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        const fb = feedbacks.find(f => f.number === rectCounter);
        if (fb) {
          showBalloon(rectData, fb);
        }
      });
      
      currentRect = null;
    }

    function showBalloon(rectData, existingData = null) {
      // 既存の吹き出しを削除
      const existing = document.querySelector('.feedback-balloon');
      if (existing) existing.remove();
      
      const balloon = document.createElement('div');
      balloon.className = 'feedback-balloon';
      balloon.style.left = (rectData.left + rectData.width + 20) + 'px';
      balloon.style.top = rectData.top + 'px';
      
      balloon.innerHTML = `
        <h4>📝 指示 No.${rectData.number}</h4>
        <div class="feedback-balloon-group">
          <label>指示内容 *</label>
          <textarea id="balloonComment" placeholder="修正内容を入力">${existingData ? existingData.comment : ''}</textarea>
        </div>
        <div class="feedback-balloon-group">
          <label>優先度</label>
          <select id="balloonPriority">
            <option value="高" ${existingData && existingData.priority === '高' ? 'selected' : ''}>高</option>
            <option value="中" ${existingData && existingData.priority === '中' ? 'selected' : ''}>中</option>
            <option value="低" ${existingData && existingData.priority === '低' ? 'selected' : ''}>低</option>
          </select>
        </div>
        <div class="feedback-balloon-group">
          <label>カテゴリ</label>
          <select id="balloonCategory">
            <option value="デザイン" ${existingData && existingData.category === 'デザイン' ? 'selected' : ''}>デザイン</option>
            <option value="テキスト" ${existingData && existingData.category === 'テキスト' ? 'selected' : ''}>テキスト</option>
            <option value="機能" ${existingData && existingData.category === '機能' ? 'selected' : ''}>機能</option>
            <option value="レイアウト" ${existingData && existingData.category === 'レイアウト' ? 'selected' : ''}>レイアウト</option>
            <option value="リンク" ${existingData && existingData.category === 'リンク' ? 'selected' : ''}>リンク</option>
            <option value="その他" ${existingData && existingData.category === 'その他' ? 'selected' : ''}>その他</option>
          </select>
        </div>
        <div class="feedback-balloon-buttons">
          ${existingData ? '<button id="balloonDelete" style="background: #dc3545; color: white;">削除</button>' : ''}
          <button id="balloonCancel" style="background: #6c757d; color: white;">キャンセル</button>
          <button id="balloonSave" style="background: #007bff; color: white;">保存</button>
        </div>
      `;
      
      document.body.appendChild(balloon);
      
      document.getElementById('balloonCancel').addEventListener('click', () => {
        balloon.remove();
        if (!existingData) {
          const rect = document.querySelector(`.feedback-rect[data-number="${rectData.number}"]`);
          if (rect) rect.remove();
          rectCounter--;
        }
      });
      
      document.getElementById('balloonSave').addEventListener('click', () => {
        saveFeedback(rectData, existingData);
        balloon.remove();
      });
      
      if (existingData) {
        document.getElementById('balloonDelete').addEventListener('click', () => {
          deleteFeedback(rectData.number);
          balloon.remove();
        });
      }
      
      // 自動フォーカス
      document.getElementById('balloonComment').focus();
    }

    function saveFeedback(rectData, existingData) {
      const comment = document.getElementById('balloonComment').value.trim();
      const priority = document.getElementById('balloonPriority').value;
      const category = document.getElementById('balloonCategory').value;
      
      if (!comment) {
        alert('指示内容を入力してください');
        showBalloon(rectData, existingData);
        return;
      }
      
      const feedback = {
        number: rectData.number,
        comment,
        priority,
        category,
        rect: rectData,
        url: window.location.href,
        timestamp: new Date().toLocaleString('ja-JP')
      };
      
      if (existingData) {
        const index = feedbacks.findIndex(f => f.number === rectData.number);
        feedbacks[index] = feedback;
      } else {
        feedbacks.push(feedback);
      }
      
      updateFeedbackList();
      updateButtons();
    }

    function deleteFeedback(number) {
      if (confirm('この指示を削除しますか?')) {
        const index = feedbacks.findIndex(f => f.number === number);
        feedbacks.splice(index, 1);
        
        const rect = document.querySelector(`.feedback-rect[data-number="${number}"]`);
        if (rect) rect.remove();
        
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
            <strong>No.${fb.number}</strong> [${fb.priority}] ${fb.category}<br>
            <small>${fb.comment.substring(0, 30)}${fb.comment.length > 30 ? '...' : ''}</small>
          </div>
        `).join('');
      }
    }

    function updateButtons() {
      const hasData = feedbacks.length > 0;
      document.getElementById('shareUrl').disabled = !hasData;
      document.getElementById('clearAll').disabled = !hasData;
      
      const countBadge = document.querySelector('.feedback-count');
      if (countBadge) {
        countBadge.textContent = feedbacks.length;
      }
    }

    function generateShareUrl() {
      if (feedbacks.length === 0) {
        alert('共有する指示がありません');
        return;
      }

      try {
        // データをJSON化してBase64エンコード
        const jsonData = JSON.stringify(feedbacks);
        const encodedData = encodeURIComponent(btoa(jsonData));
        
        // 現在のURLに追加
        const baseUrl = window.location.href.split('?')[0];
        const shareUrl = `${baseUrl}?feedback=${encodedData}`;
        
        // クリップボードにコピー
        navigator.clipboard.writeText(shareUrl).then(() => {
          alert(`共有URLをクリップボードにコピーしました!\n\n指示件数: ${feedbacks.length}件\n\nこのURLを共有すると、受け取った人は指示を確認できます。`);
        }).catch(() => {
          // コピー失敗時はプロンプト表示
          prompt('以下のURLをコピーして共有してください:', shareUrl);
        });
        
      } catch (error) {
        console.error('URL生成エラー:', error);
        alert('共有URL生成に失敗しました');
      }
    }

    function clearAll() {
      if (confirm('すべての指示を削除しますか?')) {
        feedbacks.length = 0;
        rectCounter = 0;
        document.querySelectorAll('.feedback-rect, .feedback-balloon').forEach(el => el.remove());
        updateFeedbackList();
        updateButtons();
      }
    }
  }

  function addStyles() {
    if (document.getElementById('feedback-tool-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'feedback-tool-styles';
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
        cursor: move;
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
      .feedback-rect {
        position: absolute;
        border: 3px solid #dc3545;
        background: rgba(220, 53, 69, 0.1);
        pointer-events: none;
        z-index: 999997;
        box-sizing: border-box;
      }
      .feedback-rect-label {
        position: absolute;
        top: -30px;
        left: 0;
        background: #dc3545;
        color: white;
        padding: 4px 10px;
        border-radius: 4px;
        font-weight: bold;
        font-size: 14px;
        font-family: sans-serif;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        pointer-events: auto;
        cursor: pointer;
      }
      .feedback-rect-label:hover {
        background: #c82333;
      }
      .feedback-balloon {
        position: absolute;
        background: white;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 15px;
        min-width: 300px;
        z-index: 999998;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .feedback-balloon::before {
        content: '';
        position: absolute;
        left: -10px;
        top: 20px;
        width: 0;
        height: 0;
        border-top: 10px solid transparent;
        border-bottom: 10px solid transparent;
        border-right: 10px solid #333;
      }
      .feedback-balloon::after {
        content: '';
        position: absolute;
        left: -7px;
        top: 22px;
        width: 0;
        height: 0;
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
        border-right: 8px solid white;
      }
      .feedback-balloon h4 {
        margin: 0 0 12px 0;
        font-size: 15px;
        color: #333;
      }
      .feedback-balloon-group {
        margin-bottom: 10px;
      }
      .feedback-balloon-group label {
        display: block;
        margin-bottom: 4px;
        font-weight: 600;
        font-size: 13px;
        color: #555;
      }
      .feedback-balloon-group textarea,
      .feedback-balloon-group select {
        width: 100%;
        padding: 6px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 13px;
        box-sizing: border-box;
        font-family: inherit;
      }
      .feedback-balloon-group textarea {
        min-height: 80px;
        resize: vertical;
      }
      .feedback-balloon-buttons {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }
      .feedback-balloon-buttons button {
        flex: 1;
        padding: 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
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
        font-size: 13px;
      }
      .feedback-list-item:last-child {
        border-bottom: none;
      }
    `;
    document.head.appendChild(style);
  }
})();