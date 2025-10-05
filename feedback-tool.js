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
      <h3>📝 修正指示ツール</h3>
      <button class="feedback-tool-btn feedback-tool-btn-primary" id="toggleAddingMode">
        🖱️ 範囲指定モード開始
      </button>
      <div style="margin: 10px 0;">
        <div style="margin-bottom: 8px; padding: 10px; border: 2px dashed #ddd; border-radius: 4px; text-align: center; background: #f8f9fa; cursor: pointer;" id="importArea">
          <div style="font-size: 13px; color: #666;">📁 ファイルをドロップ</div>
          <div style="font-size: 11px; color: #999; margin-top: 4px;">または クリックして選択</div>
          <input type="file" id="fileInput" accept=".json" style="display: none;">
        </div>
        <textarea id="clipboardInput" placeholder="共有コードを貼り付け" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; min-height: 60px; box-sizing: border-box; font-family: monospace; resize: vertical;"></textarea>
        <button class="feedback-tool-btn" id="loadFromClipboard" style="background: #17a2b8; color: white; margin-top: 5px;">
          📋 共有コードから読み込み
        </button>
      </div>
      <button class="feedback-tool-btn feedback-tool-btn-success" id="exportData" disabled>
        📥 ファイル出力 <span class="feedback-count">0</span>
      </button>
      <button class="feedback-tool-btn feedback-tool-btn-success" id="copyToClipboard" disabled>
        📤 共有コード生成
      </button>
      <button class="feedback-tool-btn feedback-tool-btn-danger" id="clearAll" disabled>
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

    const panelHeader = panel.querySelector('h3');
    panelHeader.addEventListener('mousedown', panelDragStart);

    function panelDragStart(e) {
      if (e.target !== panelHeader) return;
      panelInitialX = e.clientX - panel.offsetLeft;
      panelInitialY = e.clientY - panel.offsetTop;
      isPanelDragging = true;
    }

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

    document.addEventListener('mousemove', panelDrag);
    document.addEventListener('mouseup', panelDragEnd);

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
          
          // データを読み込み
          data.forEach(fb => {
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
    document.getElementById('copyToClipboard').addEventListener('click', copyToClipboard);
    document.getElementById('loadFromClipboard').addEventListener('click', loadFromClipboard);
    document.getElementById('clearAll').addEventListener('click', clearAll);
    document.getElementById('closePanel').addEventListener('click', () => {
      if (confirm('修正指示ツールを終了しますか?')) {
        // イベントリスナーを削除
        document.removeEventListener('mousedown', handleMouseDown, true);
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('mouseup', handleMouseUp, true);
        document.removeEventListener('mousemove', panelDrag);
        document.removeEventListener('mouseup', panelDragEnd);
        
        // すべての要素を削除
        panel.remove();
        document.querySelectorAll('.feedback-rect, .feedback-balloon').forEach(el => el.remove());
        
        // スタイルも削除
        const styleEl = document.getElementById('feedback-tool-styles');
        if (styleEl) styleEl.remove();
        
        // カーソルを元に戻す
        document.body.style.cursor = '';
        
        // フラグをリセット
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
      
      // 配置されたDOM要素を特定
      const targetElement = getElementAtPosition(rectData.left + rectData.width / 2, rectData.top + rectData.height / 2);
      rectData.domSelector = targetElement ? generateSelector(targetElement) : null;
      
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
      let rectData = feedback.rect;
      
      // DOM要素ベースで位置を再計算
      if (feedback.rect.domSelector) {
        console.log('Loading with selector:', feedback.rect.domSelector);
        try {
          const element = document.querySelector(feedback.rect.domSelector);
          if (element) {
            const elemRect = element.getBoundingClientRect();
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            
            // 元の相対位置を維持
            const relativeLeft = feedback.rect.relativeLeft || 0;
            const relativeTop = feedback.rect.relativeTop || 0;
            
            const newLeft = Math.round(elemRect.left + scrollX + relativeLeft);
            const newTop = Math.round(elemRect.top + scrollY + relativeTop);
            
            console.log('Element found, repositioning:', {
              elementPos: { left: elemRect.left + scrollX, top: elemRect.top + scrollY },
              relative: { left: relativeLeft, top: relativeTop },
              newPos: { left: newLeft, top: newTop }
            });
            
            rectData = {
              ...rectData,
              left: newLeft,
              top: newTop
            };
            
            // feedbackオブジェクトも更新
            feedback.rect.left = rectData.left;
            feedback.rect.top = rectData.top;
          } else {
            console.warn('DOM要素が見つかりません:', feedback.rect.domSelector);
          }
        } catch (error) {
          console.error('セレクタエラー:', error);
        }
      } else {
        console.log('No DOM selector, using absolute position');
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
      
      // DOM要素ベースの情報を追加保存
      const centerX = rectData.left + rectData.width / 2;
      const centerY = rectData.top + rectData.height / 2;
      const targetElement = getElementAtPosition(centerX, centerY);
      
      if (targetElement) {
        const elemRect = targetElement.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        const selector = generateSelector(targetElement);
        console.log('Generated selector:', selector);
        
        rectData.domSelector = selector;
        rectData.relativeLeft = rectData.left - (elemRect.left + scrollX);
        rectData.relativeTop = rectData.top - (elemRect.top + scrollY);
        
        console.log('Saved with DOM info:', {
          selector,
          relativeLeft: rectData.relativeLeft,
          relativeTop: rectData.relativeTop
        });
      } else {
        console.warn('DOM element not found at position');
      }
      
      const feedback = {
        number: rectData.number,
        comment,
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
      document.getElementById('copyToClipboard').disabled = !hasData;
      document.getElementById('clearAll').disabled = !hasData;
      
      const countBadge = document.querySelector('.feedback-count');
      if (countBadge) {
        countBadge.textContent = feedbacks.length;
      }
    }

    function copyToClipboard() {
      if (feedbacks.length === 0) {
        alert('共有する指示がありません');
        return;
      }

      try {
        const jsonData = JSON.stringify(feedbacks);
        const compressed = btoa(encodeURIComponent(jsonData));
        const shareCode = `FBK:${compressed}`;
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(shareCode).then(() => {
            alert(`共有コードをクリップボードにコピーしました!\n\n指示件数: ${feedbacks.length}件\n\nSlackやメールに貼り付けて共有してください。`);
          }).catch(() => {
            prompt('以下の共有コードをコピーして共有してください:', shareCode);
          });
        } else {
          prompt('以下の共有コードをコピーして共有してください:', shareCode);
        }
      } catch (error) {
        console.error('共有コード生成エラー:', error);
        alert('共有コード生成に失敗しました');
      }
    }

    function loadFromClipboard() {
      const input = document.getElementById('clipboardInput').value.trim();
      
      if (!input) {
        alert('共有コードを貼り付けてください');
        return;
      }
      
      if (!input.startsWith('FBK:')) {
        alert('無効な共有コードです');
        return;
      }
      
      try {
        const compressed = input.substring(4);
        const jsonData = decodeURIComponent(atob(compressed));
        const data = JSON.parse(jsonData);
        
        // 既存の矩形とデータをクリア
        feedbacks.length = 0;
        document.querySelectorAll('.feedback-rect').forEach(el => el.remove());
        
        // データを読み込み
        data.forEach(fb => {
          feedbacks.push(fb);
          createRect(fb);
        });
        
        rectCounter = Math.max(...feedbacks.map(f => f.number), 0);
        updateFeedbackList();
        updateButtons();
        
        document.getElementById('clipboardInput').value = '';
        alert(`${feedbacks.length}件の指示を読み込みました`);
      } catch (error) {
        console.error('読み込みエラー:', error);
        alert('共有コードの読み込みに失敗しました');
      }
    }

    function getElementAtPosition(x, y) {
      // 一時的に矩形と吹き出しを非表示
      const rects = document.querySelectorAll('.feedback-rect, .feedback-balloon, .feedback-tool-panel');
      const originalPointers = [];
      rects.forEach(el => {
        originalPointers.push(el.style.pointerEvents);
        el.style.display = 'none';
      });
      
      // スクロール位置を考慮した座標でelementを取得
      const clientX = x - window.pageXOffset;
      const clientY = y - window.pageYOffset;
      const element = document.elementFromPoint(clientX, clientY);
      
      // 元に戻す
      rects.forEach((el, i) => {
        el.style.display = '';
        el.style.pointerEvents = originalPointers[i];
      });
      
      console.log('Position:', x, y, 'Element:', element);
      return element && element !== document.body && element !== document.documentElement ? element : null;
    }

    function generateSelector(element) {
      if (!element) return null;
      
      // IDがある場合はIDを使用
      if (element.id) {
        return `#${element.id}`;
      }
      
      // パスを生成
      const path = [];
      let current = element;
      
      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        
        // クラスがある場合は追加
        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\s+/)
            .filter(c => c && !c.startsWith('feedback-')); // ツール自身のクラスは除外
          if (classes.length > 0) {
            selector += '.' + classes.join('.');
          }
        }
        
        // 兄弟要素の中での位置
        if (current.parentElement) {
          const siblings = Array.from(current.parentElement.children)
            .filter(el => el.tagName === current.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
          }
        }
        
        path.unshift(selector);
        current = current.parentElement;
      }
      
      return path.join(' > ');
    }

    function exportData() {
      if (feedbacks.length === 0) {
        alert('出力する指示がありません');
        return;
      }

      const dataStr = JSON.stringify(feedbacks, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `修正指示_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      alert(`${feedbacks.length}件の指示をファイルに出力しました`);
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