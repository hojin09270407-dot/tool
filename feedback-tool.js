(function() {
  'use strict';

  if (window.feedbackToolLoaded) {
    alert('修正指示ツールは既に起動しています');
    return;
  }
  window.feedbackToolLoaded = true;

  initFeedbackTool();

  function initFeedbackTool() {
    const feedbacks = [];
    let isAddingMode = false;
    let isDragging = false;
    let isResizing = false;
    let isMoving = false;
    let startX, startY, currentRect, currentFeedback;
    let rectCounter = 0;
    let resizeHandle = '';

    // スタイルを追加
    addStyles();

    // コントロールパネルを作成
    const panel = document.createElement('div');
    panel.className = 'feedback-tool-panel';
    panel.innerHTML = `
      <div class="feedback-panel-toggle" id="panelToggle">
        <span>📝</span>
      </div>
      <div class="feedback-panel-content">
        <h3>📝 修正指示ツール</h3>
        <button class="feedback-tool-btn feedback-tool-btn-primary" id="toggleAddingMode">
          🖱️ 範囲指定モード開始
        </button>
        <div style="margin: 10px 0; padding: 10px; border: 2px dashed #ddd; border-radius: 4px; text-align: center; background: #f8f9fa; cursor: pointer;" id="importArea">
          <div style="font-size: 13px; color: #666;">📁 ファイルをドロップ</div>
          <div style="font-size: 11px; color: #999; margin-top: 4px;">または クリックして選択</div>
          <input type="file" id="fileInput" accept=".json" style="display: none;">
        </div>
        <button class="feedback-tool-btn feedback-tool-btn-success" id="exportData" disabled>
          📥 データ出力 <span class="feedback-count">0</span>
        </button>
        <button class="feedback-tool-btn feedback-tool-btn-danger" id="clearAll" disabled>
          🗑️ すべてクリア
        </button>
        <div class="feedback-list" id="feedbackList"></div>
        <button class="feedback-tool-btn" id="closePanel" style="background: #6c757d; color: white; margin-top: 10px;">
          ✕ 閉じる
        </button>
      </div>
    `;
    document.body.appendChild(panel);

    // ページ全体を左にシフト
    const originalBodyStyle = {
      marginRight: document.body.style.marginRight,
      transition: document.body.style.transition
    };
    document.body.style.transition = 'margin-right 0.3s ease';
    document.body.style.marginRight = '320px';

    // パネルの開閉
    let isPanelOpen = true;
    document.getElementById('panelToggle').addEventListener('click', () => {
      isPanelOpen = !isPanelOpen;
      if (isPanelOpen) {
        panel.classList.remove('closed');
        document.body.style.marginRight = '320px';
      } else {
        panel.classList.add('closed');
        document.body.style.marginRight = '0';
      }
    });

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

    // インポート/エクスポート
    const importArea = document.getElementById('importArea');
    const fileInput = document.getElementById('fileInput');

    importArea.addEventListener('click', () => fileInput.click());
    
    importArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      importArea.style.background = '#e3f2fd';
    });
    
    importArea.addEventListener('dragleave', () => {
      importArea.style.background = '#f8f9fa';
    });
    
    importArea.addEventListener('drop', (e) => {
      e.preventDefault();
      importArea.style.background = '#f8f9fa';
      const file = e.dataTransfer.files[0];
      if (file) loadFile(file);
    });
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) loadFile(file);
    });

    function loadFile(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          
          // 既存の矩形とデータをクリア
          feedbacks.length = 0;
          document.querySelectorAll('.feedback-rect').forEach(el => el.remove());
          
          // 新形式と旧形式の両方に対応
          let feedbacksData;
          if (data.feedbacks && Array.isArray(data.feedbacks)) {
            // 新形式
            feedbacksData = data.feedbacks;
            
            // サイズ差の警告
            const currentWidth = document.body.scrollWidth;
            const currentHeight = document.body.scrollHeight;
            if (data.baseWidth && (Math.abs(currentWidth - data.baseWidth) > 100)) {
              const sizeDiff = Math.round(((currentWidth - data.baseWidth) / data.baseWidth) * 100);
              alert(`注意: このファイルは${data.baseWidth}x${data.baseHeight}pxで作成されました。\n現在の画面サイズ: ${currentWidth}x${currentHeight}px\n\n位置が${Math.abs(sizeDiff)}%程度ずれる可能性があります。`);
            }
          } else {
            // 旧形式（配列のみ）
            feedbacksData = data;
          }
          
          // データを読み込み
          feedbacksData.forEach(fb => {
            feedbacks.push(fb);
            createRect(fb);
          });
          
          rectCounter = Math.max(...feedbacks.map(f => f.number), 0);
          updateFeedbackList();
          updateButtons();
          alert(`${feedbacks.length}件の指示を読み込みました`);
        } catch (error) {
          alert('ファイルの読み込みに失敗しました');
          console.error(error);
        }
      };
      reader.readAsText(file);
    }

    document.getElementById('exportData').addEventListener('click', exportData);
    document.getElementById('clearAll').addEventListener('click', clearAll);
    document.getElementById('closePanel').addEventListener('click', () => {
      if (confirm('修正指示ツールを終了しますか?')) {
        // bodyのスタイルを元に戻す
        document.body.style.marginRight = originalBodyStyle.marginRight;
        document.body.style.transition = originalBodyStyle.transition;
        
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
      // リサイズハンドルをクリックした場合
      if (e.target.classList.contains('feedback-resize-handle')) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        resizeHandle = e.target.dataset.handle;
        currentRect = e.target.closest('.feedback-rect');
        const number = parseInt(currentRect.dataset.number);
        currentFeedback = feedbacks.find(f => f.number === number);
        startX = e.pageX;
        startY = e.pageY;
        return;
      }

      // 矩形本体をクリックした場合（移動）
      if (e.target.classList.contains('feedback-rect') && !e.target.closest('.feedback-rect-label')) {
        e.preventDefault();
        e.stopPropagation();
        isMoving = true;
        currentRect = e.target;
        const number = parseInt(currentRect.dataset.number);
        currentFeedback = feedbacks.find(f => f.number === number);
        startX = e.pageX - currentFeedback.rect.left;
        startY = e.pageY - currentFeedback.rect.top;
        currentRect.style.cursor = 'move';
        return;
      }

      // 新規作成モード
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
      // リサイズ中
      if (isResizing) {
        e.preventDefault();
        const deltaX = e.pageX - startX;
        const deltaY = e.pageY - startY;
        
        const originalRect = currentFeedback.rect;
        let newLeft = originalRect.left;
        let newTop = originalRect.top;
        let newWidth = originalRect.width;
        let newHeight = originalRect.height;

        if (resizeHandle.includes('e')) {
          newWidth = originalRect.width + deltaX;
        }
        if (resizeHandle.includes('w')) {
          newWidth = originalRect.width - deltaX;
          newLeft = originalRect.left + deltaX;
        }
        if (resizeHandle.includes('s')) {
          newHeight = originalRect.height + deltaY;
        }
        if (resizeHandle.includes('n')) {
          newHeight = originalRect.height - deltaY;
          newTop = originalRect.top + deltaY;
        }

        if (newWidth > 20 && newHeight > 20) {
          currentRect.style.left = newLeft + 'px';
          currentRect.style.top = newTop + 'px';
          currentRect.style.width = newWidth + 'px';
          currentRect.style.height = newHeight + 'px';
          
          currentFeedback.rect.left = newLeft;
          currentFeedback.rect.top = newTop;
          currentFeedback.rect.width = newWidth;
          currentFeedback.rect.height = newHeight;
          
          startX = e.pageX;
          startY = e.pageY;
        }
        return;
      }

      // 移動中
      if (isMoving) {
        e.preventDefault();
        const newLeft = e.pageX - startX;
        const newTop = e.pageY - startY;
        
        currentRect.style.left = newLeft + 'px';
        currentRect.style.top = newTop + 'px';
        
        currentFeedback.rect.left = newLeft;
        currentFeedback.rect.top = newTop;
        return;
      }

      // 新規作成中
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
      if (isResizing) {
        isResizing = false;
        resizeHandle = '';
        currentRect = null;
        currentFeedback = null;
        return;
      }

      if (isMoving) {
        isMoving = false;
        currentRect.style.cursor = '';
        currentRect = null;
        currentFeedback = null;
        return;
      }

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
      
      // ラベルとリサイズハンドルを追加
      setupRect(currentRect, rectCounter);
      
      // 吹き出しを表示
      showBalloon(rectData);
      
      currentRect = null;
    }

    function setupRect(rect, number) {
      rect.dataset.number = number;
      rect.style.pointerEvents = 'auto';
      rect.style.cursor = 'move';
      
      // ラベル
      const label = document.createElement('div');
      label.className = 'feedback-rect-label';
      label.textContent = number;
      label.dataset.number = number;
      rect.appendChild(label);
      
      // リサイズハンドル
      const handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
      handles.forEach(handle => {
        const div = document.createElement('div');
        div.className = 'feedback-resize-handle';
        div.dataset.handle = handle;
        div.style.cursor = handle + '-resize';
        rect.appendChild(div);
      });
      
      label.addEventListener('click', (e) => {
        e.stopPropagation();
        const fb = feedbacks.find(f => f.number === number);
        if (fb) {
          showBalloon(fb.rect, fb);
        }
      });
    }

    function createRect(feedback) {
      // 相対位置から絶対位置を計算
      const bodyWidth = document.body.scrollWidth;
      const bodyHeight = document.body.scrollHeight;
      
      let rectData;
      if (feedback.relativeRect) {
        // 相対位置がある場合は現在の画面サイズで再計算
        rectData = {
          number: feedback.number,
          left: Math.round((feedback.relativeRect.leftPercent / 100) * bodyWidth),
          top: Math.round((feedback.relativeRect.topPercent / 100) * bodyHeight),
          width: Math.round((feedback.relativeRect.widthPercent / 100) * bodyWidth),
          height: Math.round((feedback.relativeRect.heightPercent / 100) * bodyHeight)
        };
        
        // feedbackオブジェクトのrectも更新
        feedback.rect = rectData;
      } else {
        // 旧形式（絶対座標）の場合はそのまま使用
        rectData = feedback.rect;
      }
      
      const rect = document.createElement('div');
      rect.className = 'feedback-rect';
      rect.style.left = rectData.left + 'px';
      rect.style.top = rectData.top + 'px';
      rect.style.width = rectData.width + 'px';
      rect.style.height = rectData.height + 'px';
      
      setupRect(rect, feedback.number);
      document.body.appendChild(rect);
    }

    function showBalloon(rectData, existingData = null) {
      // 既存の吹き出しを削除
      const existing = document.querySelector('.feedback-balloon');
      if (existing) existing.remove();
      
      const balloon = document.createElement('div');
      balloon.className = 'feedback-balloon';
      
      // 左右どちらに表示するか判定
      const windowWidth = window.innerWidth;
      const balloonWidth = 320;
      const rightSpace = windowWidth - (rectData.left + rectData.width);
      const leftSpace = rectData.left;
      
      if (rightSpace >= balloonWidth + 20) {
        // 右側に表示
        balloon.style.left = (rectData.left + rectData.width + 20) + 'px';
        balloon.classList.add('balloon-right');
      } else if (leftSpace >= balloonWidth + 20) {
        // 左側に表示
        balloon.style.left = (rectData.left - balloonWidth - 20) + 'px';
        balloon.classList.add('balloon-left');
      } else {
        // どちらも無理なら右側
        balloon.style.left = (rectData.left + rectData.width + 20) + 'px';
        balloon.classList.add('balloon-right');
      }
      
      balloon.style.top = rectData.top + 'px';
      
      balloon.innerHTML = `
        <h4>📝 指示 No.${rectData.number}</h4>
        <div class="feedback-balloon-group">
          <label>指示内容 *</label>
          <textarea id="balloonComment" placeholder="修正内容を入力">${existingData ? existingData.comment : ''}</textarea>
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
      
      if (!comment) {
        alert('指示内容を入力してください');
        showBalloon(rectData, existingData);
        return;
      }
      
      // 相対位置で保存（パーセンテージ）
      const bodyWidth = document.body.scrollWidth;
      const bodyHeight = document.body.scrollHeight;
      
      const feedback = {
        number: rectData.number,
        comment,
        rect: {
          number: rectData.number,
          left: rectData.left,
          top: rectData.top,
          width: rectData.width,
          height: rectData.height
        },
        // 相対位置を追加保存
        relativeRect: {
          leftPercent: (rectData.left / bodyWidth) * 100,
          topPercent: (rectData.top / bodyHeight) * 100,
          widthPercent: (rectData.width / bodyWidth) * 100,
          heightPercent: (rectData.height / bodyHeight) * 100
        },
        baseWidth: bodyWidth,
        baseHeight: bodyHeight,
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
          <div class="feedback-list-item" data-number="${fb.number}" style="cursor: pointer;">
            <strong>No.${fb.number}</strong><br>
            <small>${fb.comment.substring(0, 40)}${fb.comment.length > 40 ? '...' : ''}</small>
          </div>
        `).join('');
        
        // クリックでアンカー遷移
        document.querySelectorAll('.feedback-list-item').forEach(item => {
          item.addEventListener('click', () => {
            const number = parseInt(item.dataset.number);
            const rect = document.querySelector(`.feedback-rect[data-number="${number}"]`);
            if (rect) {
              rect.scrollIntoView({ behavior: 'smooth', block: 'center' });
              rect.style.boxShadow = '0 0 20px rgba(220, 53, 69, 0.8)';
              setTimeout(() => {
                rect.style.boxShadow = '';
              }, 1000);
            }
          });
        });
      }
    }

    function updateButtons() {
      const hasData = feedbacks.length > 0;
      document.getElementById('exportData').disabled = !hasData;
      document.getElementById('clearAll').disabled = !hasData;
      
      const countBadge = document.querySelector('.feedback-count');
      if (countBadge) {
        countBadge.textContent = feedbacks.length;
      }
    }

    function exportData() {
      if (feedbacks.length === 0) {
        alert('出力する指示がありません');
        return;
      }

      // 出力情報を追加
      const exportData = {
        version: '1.1',
        createdAt: new Date().toISOString(),
        baseWidth: document.body.scrollWidth,
        baseHeight: document.body.scrollHeight,
        feedbacks: feedbacks
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `修正指示_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      alert(`${feedbacks.length}件の指示をファイルに出力しました\n\n基準サイズ: ${exportData.baseWidth}x${exportData.baseHeight}px`);
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
        top: 0;
        right: 0;
        height: 100vh;
        background: white;
        border-left: 2px solid #333;
        z-index: 999999;
        box-shadow: -4px 0 12px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        width: 320px;
        display: flex;
        transition: transform 0.3s ease;
      }
      .feedback-tool-panel.closed {
        transform: translateX(320px);
      }
      .feedback-panel-toggle {
        position: absolute;
        left: -40px;
        top: 20px;
        width: 40px;
        height: 40px;
        background: #007bff;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 8px 0 0 8px;
        box-shadow: -2px 2px 8px rgba(0,0,0,0.2);
        font-size: 20px;
        transition: background 0.2s;
      }
      .feedback-panel-toggle:hover {
        background: #0056b3;
      }
      .feedback-panel-content {
        width: 100%;
        padding: 20px;
        overflow-y: auto;
        box-sizing: border-box;
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
        z-index: 999997;
        box-sizing: border-box;
        transition: box-shadow 0.3s;
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
        cursor: pointer;
        pointer-events: auto;
      }
      .feedback-rect-label:hover {
        background: #c82333;
      }
      .feedback-resize-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        background: #dc3545;
        border: 2px solid white;
        box-shadow: 0 0 3px rgba(0,0,0,0.3);
        pointer-events: auto;
      }
      .feedback-resize-handle[data-handle="nw"] { top: -5px; left: -5px; cursor: nw-resize; }
      .feedback-resize-handle[data-handle="n"] { top: -5px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
      .feedback-resize-handle[data-handle="ne"] { top: -5px; right: -5px; cursor: ne-resize; }
      .feedback-resize-handle[data-handle="e"] { top: 50%; right: -5px; transform: translateY(-50%); cursor: e-resize; }
      .feedback-resize-handle[data-handle="se"] { bottom: -5px; right: -5px; cursor: se-resize; }
      .feedback-resize-handle[data-handle="s"] { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
      .feedback-resize-handle[data-handle="sw"] { bottom: -5px; left: -5px; cursor: sw-resize; }
      .feedback-resize-handle[data-handle="w"] { top: 50%; left: -5px; transform: translateY(-50%); cursor: w-resize; }
      .feedback-balloon {
        position: absolute;
        background: white;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 15px;
        width: 300px;
        z-index: 999998;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }
      .feedback-balloon.balloon-right::before {
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
      .feedback-balloon.balloon-right::after {
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
      .feedback-balloon.balloon-left::before {
        content: '';
        position: absolute;
        right: -10px;
        top: 20px;
        width: 0;
        height: 0;
        border-top: 10px solid transparent;
        border-bottom: 10px solid transparent;
        border-left: 10px solid #333;
      }
      .feedback-balloon.balloon-left::after {
        content: '';
        position: absolute;
        right: -7px;
        top: 22px;
        width: 0;
        height: 0;
        border-top: 8px solid transparent;
        border-bottom: 8px solid transparent;
        border-left: 8px solid white;
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
      .feedback-balloon-group textarea {
        width: 100%;
        padding: 6px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 13px;
        box-sizing: border-box;
        font-family: inherit;
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
        transition: background 0.2s;
      }
      .feedback-list-item:hover {
        background: #f8f9fa;
      }
      .feedback-list-item:last-child {
        border-bottom: none;
      }
    `;
    document.head.appendChild(style);
  }
})();