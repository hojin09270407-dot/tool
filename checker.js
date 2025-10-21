(function() {
    'use strict';
    
    // 既存のオーバーレイがあれば削除
    const existingOverlay = document.getElementById('web-checker-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // SheetJSライブラリを動的に読み込む関数
    function loadSheetJS() {
        return new Promise((resolve, reject) => {
            if (window.XLSX) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('SheetJSの読み込みに失敗しました'));
            document.head.appendChild(script);
        });
    }

    // メインUI作成（ヘッダー形式）
    function createMainUI() {
        // 既存のパネルがあれば削除
        const existingPanel = document.getElementById('web-checker-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        const panel = document.createElement('div');
        panel.id = 'web-checker-panel';
        panel.style.cssText = `
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 60px !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            border-top: 3px solid #4285f4 !important;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.1) !important;
            z-index: 999999 !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 0 20px !important;
            box-sizing: border-box !important;
            margin: 0 !important;
        `;
        
        // 左側：タイトル
        const title = document.createElement('div');
        title.textContent = '🔍 Dツール';
        title.style.cssText = `
            color: white;
            font-size: 16px;
            font-weight: 700;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            flex-shrink: 0;
        `;
        
        // 中央：メニューボタンエリア
        const menuArea = document.createElement('div');
        menuArea.id = 'web-checker-menu-area';
        menuArea.style.cssText = `
            display: flex;
            gap: 10px;
            overflow-x: auto;
            flex: 1;
            justify-content: center;
            padding: 0 20px;
            scrollbar-width: none;
            -ms-overflow-style: none;
        `;
        
        // スクロールバーを非表示にする
        const hideScrollbarStyle = document.createElement('style');
        hideScrollbarStyle.textContent = `
            #web-checker-menu-area::-webkit-scrollbar {
                display: none;
            }
        `;
        document.head.appendChild(hideScrollbarStyle);
        
        // 右側：閉じるボタン
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            width: 36px;
            height: 36px;
            font-size: 18px;
            cursor: pointer;
            font-weight: bold;
            flex-shrink: 0;
            transition: all 0.2s ease;
            backdrop-filter: blur(10px);
        `;
        
        closeBtn.addEventListener('mouseenter', () => {
            closeBtn.style.background = 'rgba(255,68,68,0.8)';
            closeBtn.style.transform = 'scale(1.1)';
        });
        
        closeBtn.addEventListener('mouseleave', () => {
            closeBtn.style.background = 'rgba(255,255,255,0.2)';
            closeBtn.style.transform = 'scale(1)';
        });
        
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // 浮いているエリアも削除
            const floatingArea = document.getElementById('web-checker-floating-area');
            if (floatingArea) {
                floatingArea.remove();
            }
            
            panel.style.transform = 'translateY(100%)';
            setTimeout(() => panel.remove(), 300);
        });
        
        panel.appendChild(title);
        panel.appendChild(menuArea);
        panel.appendChild(closeBtn);
        document.body.appendChild(panel);
        
        return menuArea;
    }

    // フィードバックツールを表示
    function showFeedbackTool() {
        // 既存のキャンバスがあれば削除
        const existingCanvas = document.getElementById('feedback-canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }
        
        // 既存のパレットがあれば削除
        const existingPalette = document.getElementById('feedback-palette');
        if (existingPalette) {
            existingPalette.remove();
        }
        
        createFeedbackCanvas();
        createFeedbackPalette();
    }

    // フィードバック用キャンバスを作成（図形管理機能付き）
    function createFeedbackCanvas() {
        const canvas = document.createElement('canvas');
        canvas.id = 'feedback-canvas';
        canvas.style.cssText = `
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: ${Math.max(document.documentElement.scrollWidth, window.innerWidth)}px !important;
            height: ${Math.max(document.documentElement.scrollHeight, window.innerHeight)}px !important;
            z-index: 999997 !important;
            pointer-events: auto !important;
            cursor: crosshair !important;
        `;
        
        canvas.width = Math.max(document.documentElement.scrollWidth, window.innerWidth);
        canvas.height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
        
        document.body.appendChild(canvas);
        
        // 図形管理システム
        window.feedbackShapes = [];
        let selectedShapeIndex = -1;
        
        // スクロール時の座標調整
        function getAdjustedCoordinates(e) {
            return {
                x: e.clientX + window.scrollX,
                y: e.clientY + window.scrollY
            };
        }
        
        const ctx = canvas.getContext('2d');
        let isDrawing = false;
        let isDraggingShape = false;
        let dragOffset = { x: 0, y: 0 };
        let currentTool = 'pen';
        let currentColor = '#b22222';
        let currentSize = 3;
        let currentFillMode = false;
        let startX, startY;
        let previewCanvas = null;
        
        // 図形を追加
        function addShape(type, x1, y1, x2, y2, color, lineWidth, fill, penPath = null) {
            const shape = {
                type: type,
                x1: x1,
                y1: y1,
                x2: x2,
                y2: y2,
                color: color,
                lineWidth: lineWidth,
                fill: fill,
                penPath: penPath, // ペンの軌跡を保存
                id: Date.now() + Math.random()
            };
            window.feedbackShapes.push(shape);
            redrawCanvas();
        }
        
        // キャンバスを再描画
        function redrawCanvas() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            window.feedbackShapes.forEach((shape, index) => {
                if (shape.type === 'pen') {
                    // ペンの軌跡を描画
                    drawPenPath(ctx, shape.penPath, shape.color, shape.lineWidth);
                } else if (shape.type === 'rectangle') {
                    drawRectangle(ctx, shape.x1, shape.y1, shape.x2, shape.y2, shape.color, shape.lineWidth, shape.fill);
                } else if (shape.type === 'circle') {
                    drawCircle(ctx, shape.x1, shape.y1, shape.x2, shape.y2, shape.color, shape.lineWidth, shape.fill);
                }
                
                // 選択された図形にハイライト表示
                if (index === selectedShapeIndex) {
                    drawSelectionHighlight(ctx, shape);
                }
            });
        }

        // ペンの軌跡を描画
        function drawPenPath(ctx, penPath, color, lineWidth) {
            if (!penPath || penPath.length < 2) return;
            
            ctx.beginPath();
            ctx.moveTo(penPath[0].x, penPath[0].y);
            
            for (let i = 1; i < penPath.length; i++) {
                ctx.lineTo(penPath[i].x, penPath[i].y);
            }
            
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }

        // 選択ハイライトを描画
        function drawSelectionHighlight(ctx, shape) {
            ctx.save();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            
            if (shape.type === 'rectangle') {
                ctx.strokeRect(shape.x1 - 5, shape.y1 - 5, (shape.x2 - shape.x1) + 10, (shape.y2 - shape.y1) + 10);
            } else if (shape.type === 'circle') {
                const radius = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
                ctx.beginPath();
                ctx.arc(shape.x1, shape.y1, radius + 5, 0, 2 * Math.PI);
                ctx.stroke();
            }
            ctx.restore();
        }
        
        // 図形がクリックされているかチェック
        function getShapeAtPosition(x, y) {
            for (let i = window.feedbackShapes.length - 1; i >= 0; i--) {
                const shape = window.feedbackShapes[i];
                if (isPointInShape(x, y, shape)) {
                    return i;
                }
            }
            return -1;
        }
        
        // 点が図形内にあるかチェック
        function isPointInShape(x, y, shape) {
            if (shape.type === 'rectangle') {
                const minX = Math.min(shape.x1, shape.x2);
                const maxX = Math.max(shape.x1, shape.x2);
                const minY = Math.min(shape.y1, shape.y2);
                const maxY = Math.max(shape.y1, shape.y2);
                return x >= minX && x <= maxX && y >= minY && y <= maxY;
            } else if (shape.type === 'circle') {
                const radius = Math.sqrt(Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2));
                const distance = Math.sqrt(Math.pow(x - shape.x1, 2) + Math.pow(y - shape.y1, 2));
                return distance <= radius;
            }
            return false;
        }
        
        // プレビュー用キャンバスを作成
        function createPreviewCanvas() {
            if (previewCanvas) {
                document.body.removeChild(previewCanvas);
            }
            previewCanvas = document.createElement('canvas');
            previewCanvas.style.cssText = `
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: ${Math.max(document.documentElement.scrollWidth, window.innerWidth)}px !important;
                height: ${Math.max(document.documentElement.scrollHeight, window.innerHeight)}px !important;
                z-index: 999998 !important;
                pointer-events: none !important;
            `;
            previewCanvas.width = Math.max(document.documentElement.scrollWidth, window.innerWidth);
            previewCanvas.height = Math.max(document.documentElement.scrollHeight, window.innerHeight);
            document.body.appendChild(previewCanvas);
        }
        
        // マウスダウンイベント
        canvas.addEventListener('mousedown', (e) => {
            const coords = getAdjustedCoordinates(e);
            
            if (currentTool === 'comment') {
                createCommentBubble(e.clientX, e.clientY);
                return;
            }
            
            // 図形選択・ドラッグ判定
            const shapeIndex = getShapeAtPosition(coords.x, coords.y);
            if (shapeIndex !== -1) {
                selectedShapeIndex = shapeIndex;
                isDraggingShape = true;
                const shape = window.feedbackShapes[shapeIndex];
                dragOffset.x = coords.x - shape.x1;
                dragOffset.y = coords.y - shape.y1;
                canvas.style.cursor = 'move';
                redrawCanvas();
                return;
            }
            
            selectedShapeIndex = -1;
            redrawCanvas();
            
            // 新規描画開始
            isDrawing = true;
            startX = coords.x;
            startY = coords.y;
            
            if (currentTool === 'pen') {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                // ペンの軌跡を初期化
                window.currentPenPath = [{ x: startX, y: startY }];
            } else if (currentTool === 'rectangle' || currentTool === 'circle') {
                createPreviewCanvas();
            }
        });

// マウス移動イベント
        canvas.addEventListener('mousemove', (e) => {
            const coords = getAdjustedCoordinates(e);
            
            // 図形ドラッグ中
            if (isDraggingShape && selectedShapeIndex !== -1) {
                const shape = window.feedbackShapes[selectedShapeIndex];
                const deltaX = coords.x - dragOffset.x - shape.x1;
                const deltaY = coords.y - dragOffset.y - shape.y1;
                
                shape.x1 += deltaX;
                shape.y1 += deltaY;
                shape.x2 += deltaX;
                shape.y2 += deltaY;
                
                redrawCanvas();
                return;
            }
            
            if (!isDrawing) return;
            
            if (currentTool === 'pen') {
                // ペンの場合：線を描画しつつ、線の軌跡を保存
                ctx.lineTo(coords.x, coords.y);
                ctx.strokeStyle = currentColor;
                ctx.lineWidth = currentSize;
                ctx.lineCap = 'round';
                ctx.stroke();
                
                // 線の軌跡を配列に追加
                if (!window.currentPenPath) {
                    window.currentPenPath = [];
                }
                window.currentPenPath.push({ x: coords.x, y: coords.y });
                
            } else if (currentTool === 'rectangle' && previewCanvas) {
                const previewCtx = previewCanvas.getContext('2d');
                previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                drawRectanglePreview(previewCtx, startX, startY, coords.x, coords.y, currentColor, currentSize, currentFillMode);
            } else if (currentTool === 'circle' && previewCanvas) {
                const previewCtx = previewCanvas.getContext('2d');
                previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                drawCirclePreview(previewCtx, startX, startY, coords.x, coords.y, currentColor, currentSize, currentFillMode);
            }
        });
        
        // マウスアップイベント
        canvas.addEventListener('mouseup', (e) => {
            if (isDraggingShape) {
                isDraggingShape = false;
                canvas.style.cursor = 'crosshair';
                return;
            }
            
            if (!isDrawing) return;
            
            const coords = getAdjustedCoordinates(e);
            
            if (currentTool === 'pen') {
                // ペンの軌跡を図形として保存
                if (window.currentPenPath && window.currentPenPath.length > 1) {
                    addShape('pen', 0, 0, 0, 0, currentColor, currentSize, false, window.currentPenPath);
                }
                window.currentPenPath = null;
            } else if (currentTool === 'rectangle') {
                addShape('rectangle', startX, startY, coords.x, coords.y, currentColor, currentSize, currentFillMode);
            } else if (currentTool === 'circle') {
                addShape('circle', startX, startY, coords.x, coords.y, currentColor, currentSize, currentFillMode);
            }
            
            if (previewCanvas) {
                document.body.removeChild(previewCanvas);
                previewCanvas = null;
            }
            
            isDrawing = false;
        });
        
        // キーボードイベント（図形削除）
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeIndex !== -1) {
                window.feedbackShapes.splice(selectedShapeIndex, 1);
                selectedShapeIndex = -1;
                redrawCanvas();
            }
        });
        
        // ツール変更用のグローバル関数
        window.setFeedbackTool = function(tool) {
            currentTool = tool;
            canvas.style.cursor = tool === 'comment' ? 'pointer' : 'crosshair';
            selectedShapeIndex = -1;
            redrawCanvas();
            updateToolButtons(tool);
        };
        
        window.setFeedbackColor = function(color) {
            currentColor = color;
            updateColorButtons(color);
        };
        
        window.setFeedbackSize = function(size) {
            currentSize = size;
            updateSizeButtons(size);
        };
        
        window.setFeedbackFillMode = function(fillMode) {
            currentFillMode = fillMode;
            updateFillButtons(fillMode);
        };
        
        window.clearFeedback = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            window.feedbackShapes = [];
            selectedShapeIndex = -1;
            const bubbles = document.querySelectorAll('.feedback-comment-bubble');
            bubbles.forEach(bubble => bubble.remove());
            if (previewCanvas) {
                document.body.removeChild(previewCanvas);
                previewCanvas = null;
            }
        };
        
        // 初期状態のボタン更新
        updateToolButtons('pen');
        updateColorButtons('#b22222');
        updateSizeButtons(3);
        updateFillButtons(false);
    }

    // ボタン状態更新関数
    function updateToolButtons(selectedTool) {
        const buttons = document.querySelectorAll('[data-tool]');
        buttons.forEach(btn => {
            if (btn.dataset.tool === selectedTool) {
                btn.style.background = '#4285f4';
                btn.style.color = 'white';
            } else {
                btn.style.background = '#f0f0f0';
                btn.style.color = 'black';
            }
        });
    }

    function updateColorButtons(selectedColor) {
        const buttons = document.querySelectorAll('[data-color]');
        buttons.forEach(btn => {
            if (btn.dataset.color === selectedColor) {
                btn.style.border = '3px solid #333';
            } else {
                btn.style.border = '1px solid #ccc';
            }
        });
    }

    function updateSizeButtons(selectedSize) {
        const buttons = document.querySelectorAll('[data-size]');
        buttons.forEach(btn => {
            if (parseInt(btn.dataset.size) === selectedSize) {
                btn.style.background = '#4285f4';
                btn.style.color = 'white';
            } else {
                btn.style.background = '#f0f0f0';
                btn.style.color = 'black';
            }
        });
    }

    function updateFillButtons(selectedFill) {
        const buttons = document.querySelectorAll('[data-fill]');
        buttons.forEach(btn => {
            if (btn.dataset.fill === String(selectedFill)) {
                btn.style.background = '#4285f4';
                btn.style.color = 'white';
            } else {
                btn.style.background = '#f0f0f0';
                btn.style.color = 'black';
            }
        });
    }

    // 四角形を描画
    function drawRectangle(ctx, x1, y1, x2, y2, color, lineWidth, fill = false) {
        if (fill) {
            // 半透明で塗りつぶし
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = color;
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            ctx.globalAlpha = 1.0;
            
            // 枠線を描画
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        }
    }

    // 四角形プレビュー
    function drawRectanglePreview(ctx, x1, y1, x2, y2, color, lineWidth, fill = false) {
        ctx.globalAlpha = 0.7;
        if (fill) {
            // 半透明で塗りつぶし
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = color;
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            ctx.globalAlpha = 0.7;
            
            // 枠線を描画
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        }
        ctx.globalAlpha = 1.0;
    }

    // 円を描画
    function drawCircle(ctx, x1, y1, x2, y2, color, lineWidth, fill = false) {
        const centerX = x1;
        const centerY = y1;
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        
        if (fill) {
            // 半透明で塗りつぶし
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = color;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            
            // 枠線を描画
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
    }

    // 円プレビュー
    function drawCirclePreview(ctx, x1, y1, x2, y2, color, lineWidth, fill = false) {
        const centerX = x1;
        const centerY = y1;
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        
        ctx.globalAlpha = 0.7;
        if (fill) {
            // 半透明で塗りつぶし
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = color;
            ctx.fill();
            ctx.globalAlpha = 0.7;
            
            // 枠線を描画
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
    }

    // コメントバブルを作成
    function createCommentBubble(clientX, clientY) {
        // スクロール位置を考慮した絶対座標を計算
        const absoluteX = clientX + window.scrollX;
        const absoluteY = clientY + window.scrollY;
        
        const bubble = document.createElement('div');
        bubble.className = 'feedback-comment-bubble';
        bubble.style.cssText = `
            position: absolute !important;
            left: ${absoluteX}px !important;
            top: ${absoluteY}px !important;
            background: #ffeb3b !important;
            border: 2px solid #f57f17 !important;
            border-radius: 10px !important;
            padding: 25px 8px 8px 8px !important;
            font-size: 16px !important;
            font-family: Arial, sans-serif !important;
            z-index: 999998 !important;
            width: 200px !important;
            height: 100px !important;
            min-width: 150px !important;
            min-height: 80px !important;
            max-width: 400px !important;
            max-height: 300px !important;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
            cursor: move !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
        `;
        
        const input = document.createElement('textarea');
        input.placeholder = 'コメントを入力...';
        input.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            border: none !important;
            background: transparent !important;
            resize: none !important;
            outline: none !important;
            font-size: 20px !important;
            font-family: Arial, sans-serif !important;
            box-sizing: border-box !important;
            padding: 2px !important;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute !important;
            top: 2px !important;
            right: 2px !important;
            width: 20px !important;
            height: 20px !important;
            border-radius: 50% !important;
            background: #f44336 !important;
            color: white !important;
            border: none !important;
            cursor: pointer !important;
            font-size: 12px !important;
            text-align: center !important;
            line-height: 18px !important;
            z-index: 10 !important;
        `;
        
        const resizeHandle = document.createElement('div');
        resizeHandle.style.cssText = `
            position: absolute !important;
            bottom: 0 !important;
            right: 0 !important;
            width: 15px !important;
            height: 15px !important;
            background: linear-gradient(45deg, transparent 30%, #f57f17 30%, #f57f17 40%, transparent 40%, transparent 60%, #f57f17 60%, #f57f17 70%, transparent 70%) !important;
            cursor: nw-resize !important;
            z-index: 10 !important;
            border-bottom-right-radius: 8px !important;
        `;
        
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            bubble.remove();
        });
        
        bubble.appendChild(input);
        bubble.appendChild(closeBtn);
        bubble.appendChild(resizeHandle);
        document.body.appendChild(bubble);
        
        // ドラッグ機能（絶対座標対応版）
        makeDraggableAbsolute(bubble, input);
        
        // リサイズ機能
        makeResizable(bubble, resizeHandle);
        
        // フォーカス
        input.focus();
    }

    // リサイズ機能を修正
    function makeResizable(element, handle) {
        let isResizing = false;
        let startX, startY, startWidth, startHeight;
        
        handle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(element).width, 10);
            startHeight = parseInt(document.defaultView.getComputedStyle(element).height, 10);
            e.preventDefault();
            e.stopPropagation();
            
            function onMouseMove(e) {
                if (!isResizing) return;
                
                const newWidth = Math.max(150, Math.min(400, startWidth + (e.clientX - startX)));
                const newHeight = Math.max(80, Math.min(300, startHeight + (e.clientY - startY)));
                
                element.style.width = newWidth + 'px';
                element.style.height = newHeight + 'px';
            }
            
            function onMouseUp() {
                isResizing = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }

    // フィードバックパレットを作成（改良版）
    function createFeedbackPalette() {
        const palette = document.createElement('div');
        palette.id = 'feedback-palette';
        palette.style.cssText = `
            position: fixed !important;
            top: 80px !important;
            right: 20px !important;
            background: white !important;
            border: 2px solid #4285f4 !important;
            border-radius: 10px !important;
            padding: 15px !important;
            z-index: 999999 !important;
            font-family: Arial, sans-serif !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
            min-width: 220px !important;
        `;
        
        palette.innerHTML = `
            <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">✏️ フィードバックツール</h4>
            
            <!-- ツール選択 -->
            <div style="margin-bottom: 15px;">
                <label style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 8px;">ツール:</label>
                <button onclick="setFeedbackTool('pen')" data-tool="pen" style="padding: 6px 12px; margin: 3px; border: 1px solid #ddd; background: #4285f4; color: white; cursor: pointer; border-radius: 4px; font-size: 13px;">🖊️ ペン</button>
                <button onclick="setFeedbackTool('rectangle')" data-tool="rectangle" style="padding: 6px 12px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">⬜ 四角</button>
                <button onclick="setFeedbackTool('circle')" data-tool="circle" style="padding: 6px 12px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">⭕ 円</button>
                <button onclick="setFeedbackTool('comment')" data-tool="comment" style="padding: 6px 12px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">💬 コメント</button>
            </div>
            
            <!-- 塗りつぶし選択 -->
            <div style="margin-bottom: 15px;">
                <label style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 8px;">スタイル:</label>
                <button onclick="setFeedbackFillMode(false)" data-fill="false" style="padding: 6px 10px; margin: 3px; border: 1px solid #ddd; background: #4285f4; color: white; cursor: pointer; border-radius: 4px; font-size: 13px;">線のみ</button>
                <button onclick="setFeedbackFillMode(true)" data-fill="true" style="padding: 6px 10px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">塗りつぶし</button>
            </div>
            
            <!-- 色選択 -->
            <div style="margin-bottom: 15px;">
                <label style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 8px;">色:</label>
                <button onclick="setFeedbackColor('#b22222')" data-color="#b22222" style="width: 28px; height: 28px; background: #b22222; border: 3px solid #333; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                <button onclick="setFeedbackColor('#228b22')" data-color="#228b22" style="width: 28px; height: 28px; background: #228b22; border: 1px solid #ccc; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                <button onclick="setFeedbackColor('#4169e1')" data-color="#4169e1" style="width: 28px; height: 28px; background: #4169e1; border: 1px solid #ccc; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                <button onclick="setFeedbackColor('#ccc300')" data-color="#ccc300" style="width: 28px; height: 28px; background: #ccc300; border: 1px solid #ccc; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                <button onclick="setFeedbackColor('#8b008b')" data-color="#8b008b" style="width: 28px; height: 28px; background: #8b008b; border: 1px solid #ccc; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                <button onclick="setFeedbackColor('#000000')" data-color="#000000" style="width: 28px; height: 28px; background: #000000; border: 1px solid #ccc; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
            </div>
            
            <!-- サイズ選択 -->
            <div style="margin-bottom: 15px;">
                <label style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 8px;">太さ:</label>
                <button onclick="setFeedbackSize(2)" data-size="2" style="padding: 6px 10px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">細</button>
                <button onclick="setFeedbackSize(5)" data-size="5" style="padding: 6px 10px; margin: 3px; border: 1px solid #ddd; background: #4285f4; color: white; cursor: pointer; border-radius: 4px; font-size: 13px;">普通</button>
                <button onclick="setFeedbackSize(8)" data-size="8" style="padding: 6px 10px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">太</button>
            </div>
            
            <!-- 操作説明 -->
            <div style="margin-bottom: 15px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 13px; color: #666;">
                <strong>操作方法:</strong><br>
                • 図形クリック: 選択・移動<br>
                • Delete/Backspace: 選択図形削除
            </div>
            
            <!-- アクション -->
            <div>
                <button onclick="clearFeedback()" style="width: 100%; padding: 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-bottom: 6px;">🗑️ クリア</button>
                <button onclick="closeFeedbackTool()" style="width: 100%; padding: 10px; background: #9e9e9e; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">✖️ 閉じる</button>
            </div>
        `;
        
        document.body.appendChild(palette);
    }

    // 通知表示関数
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'} !important;
            color: white !important;
            padding: 12px 20px !important;
            border-radius: 5px !important;
            z-index: 9999999 !important;
            font-size: 14px !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            font-family: Arial, sans-serif !important;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // フィードバックツールを閉じる
    window.closeFeedbackTool = function() {
        const canvas = document.getElementById('feedback-canvas');
        const palette = document.getElementById('feedback-palette');
        const bubbles = document.querySelectorAll('.feedback-comment-bubble');
        
        if (canvas) canvas.remove();
        if (palette) palette.remove();
        bubbles.forEach(bubble => bubble.remove());
    };

    // オブジェクト定規ツール
    class ObjectRuler {
        constructor() {
            this.isActive = false;
            this.ruler = null;
            this.copiedRulers = [];
            this.isDragging = false;
            this.isResizing = false;
            this.resizeHandle = '';
            this.startX = 0;
            this.startY = 0;
            
            this.boundOnMouseMove = this.onMouseMove.bind(this);
            this.boundOnMouseUp = this.onMouseUp.bind(this);
        }

        activate() {
            this.isActive = true;
            this.createRuler();
        }

        deactivate() {
            this.isActive = false;
            document.removeEventListener('mousemove', this.boundOnMouseMove);
            document.removeEventListener('mouseup', this.boundOnMouseUp);
            this.removeRuler();
            this.removeAllCopiedRulers();
            this.hideInstructions();
            this.isDragging = false;
            this.isResizing = false;
        }

        createRuler() {
            this.removeRuler();
            
            this.ruler = document.createElement('div');
            this.ruler.id = 'object-ruler';
            this.ruler.innerHTML = `
                <div class="ruler-label">200 × 100px</div>
                <button class="copy-button">📋</button>
                <button class="close-button">×</button>
                <div class="resize-handle nw"></div>
                <div class="resize-handle n"></div>
                <div class="resize-handle ne"></div>
                <div class="resize-handle e"></div>
                <div class="resize-handle se"></div>
                <div class="resize-handle s"></div>
                <div class="resize-handle sw"></div>
                <div class="resize-handle w"></div>
            `;
            
            this.ruler.style.cssText = `
                position: fixed;
                left: 100px;
                top: 100px;
                width: 200px;
                height: 100px;
                border: 2px solid #28a745;
                background: rgba(40, 167, 69, 0.1);
                z-index: 999998;
                cursor: move;
            `;
            
            // CSS追加
            const style = document.createElement('style');
            style.textContent = `
                #object-ruler .ruler-label {
                    position: absolute;
                    top: -30px;
                    left: 0;
                    background: #28a745;
                    color: white;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-family: monospace;
                    pointer-events: none;
                }
                #object-ruler .copy-button {
                    position: absolute;
                    top: 5px;
                    right: 30px;
                    background: #007bff;
                    color: white;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    z-index: 10;
                }
                #object-ruler .close-button {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 12px;
                    cursor: pointer;
                    z-index: 10;
                }
                #object-ruler .resize-handle {
                    position: absolute;
                    background: #28a745;
                    border: 1px solid white;
                }
                .resize-handle.nw, .resize-handle.ne, .resize-handle.sw, .resize-handle.se {
                    width: 8px;
                    height: 8px;
                }
                .resize-handle.n, .resize-handle.s {
                    width: 20px;
                    height: 4px;
                    left: 50%;
                    transform: translateX(-50%);
                }
                .resize-handle.e, .resize-handle.w {
                    width: 4px;
                    height: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                }
                .resize-handle.nw { top: -4px; left: -4px; cursor: nw-resize; }
                .resize-handle.n { top: -2px; cursor: n-resize; }
                .resize-handle.ne { top: -4px; right: -4px; cursor: ne-resize; }
                .resize-handle.e { right: -2px; cursor: e-resize; }
                .resize-handle.se { bottom: -4px; right: -4px; cursor: se-resize; }
                .resize-handle.s { bottom: -2px; cursor: s-resize; }
                .resize-handle.sw { bottom: -4px; left: -4px; cursor: sw-resize; }
                .resize-handle.w { left: -2px; cursor: w-resize; }
            `;
            if (!document.querySelector('style[data-object-ruler]')) {
                style.setAttribute('data-object-ruler', 'true');
                document.head.appendChild(style);
            }
            
            document.body.appendChild(this.ruler);
            this.setupRulerEvents();
        }

        setupRulerEvents() {
            this.ruler.querySelector('.copy-button').addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyRuler();
            });

            this.ruler.querySelector('.close-button').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deactivate();
            });

            this.ruler.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('resize-handle')) {
                    this.isResizing = true;
                    this.resizeHandle = e.target.classList[1];
                } else if (!e.target.classList.contains('copy-button') && !e.target.classList.contains('close-button')) {
                    this.isDragging = true;
                }
                
                this.startX = e.clientX;
                this.startY = e.clientY;
                
                document.addEventListener('mousemove', this.boundOnMouseMove);
                document.addEventListener('mouseup', this.boundOnMouseUp);
                e.preventDefault();
            });
        }

        copyRuler() {
            const rect = this.ruler.getBoundingClientRect();
            const newRuler = this.ruler.cloneNode(true);
            
            const copyId = 'object-ruler-copy-' + Date.now();
            newRuler.id = copyId;
            newRuler.style.left = (rect.left + 20) + 'px';
            newRuler.style.top = (rect.top + 20) + 'px';
            
            document.body.appendChild(newRuler);
            this.copiedRulers.push(newRuler);
            this.setupCopyRulerEvents(newRuler);
            
            showNotification('定規をコピーしました', 'success');
        }

        setupCopyRulerEvents(ruler) {
            let isDragging = false;
            let isResizing = false;
            let resizeHandle = '';
            let startX = 0;
            let startY = 0;

            // リサイズハンドルのCSSを追加
            const resizeStyle = document.createElement('style');
            resizeStyle.textContent = `
                .copied-ruler .resize-handle {
                    position: absolute;
                    background: #28a745;
                    border: 1px solid white;
                }
                .copied-ruler .resize-handle.nw, .copied-ruler .resize-handle.ne, 
                .copied-ruler .resize-handle.sw, .copied-ruler .resize-handle.se {
                    width: 8px;
                    height: 8px;
                }
                .copied-ruler .resize-handle.n, .copied-ruler .resize-handle.s {
                    width: 20px;
                    height: 4px;
                    left: 50%;
                    transform: translateX(-50%);
                }
                .copied-ruler .resize-handle.e, .copied-ruler .resize-handle.w {
                    width: 4px;
                    height: 20px;
                    top: 50%;
                    transform: translateY(-50%);
                }
                .copied-ruler .resize-handle.nw { top: -4px; left: -4px; cursor: nw-resize; }
                .copied-ruler .resize-handle.n { top: -2px; cursor: n-resize; }
                .copied-ruler .resize-handle.ne { top: -4px; right: -4px; cursor: ne-resize; }
                .copied-ruler .resize-handle.e { right: -2px; cursor: e-resize; }
                .copied-ruler .resize-handle.se { bottom: -4px; right: -4px; cursor: se-resize; }
                .copied-ruler .resize-handle.s { bottom: -2px; cursor: s-resize; }
                .copied-ruler .resize-handle.sw { bottom: -4px; left: -4px; cursor: sw-resize; }
                .copied-ruler .resize-handle.w { left: -2px; cursor: w-resize; }
            `;
            if (!document.querySelector('style[data-copied-ruler-style]')) {
                resizeStyle.setAttribute('data-copied-ruler-style', 'true');
                document.head.appendChild(resizeStyle);
            }

            ruler.classList.add('copied-ruler');

            // コピーボタンのイベント設定
            const copyButton = ruler.querySelector('.copy-button');
            if (copyButton) {
                copyButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.copySpecificRuler(ruler);
                });
            }

            // 閉じるボタンを削除ボタンに変更
            const closeButton = ruler.querySelector('.close-button');
            if (closeButton) {
                closeButton.innerHTML = '🗑️';  // ゴミ箱アイコンに変更
                closeButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    ruler.remove();
                    const index = this.copiedRulers.indexOf(ruler);
                    if (index > -1) this.copiedRulers.splice(index, 1);
                    showNotification('定規を削除しました', 'info');
                });
            }

            // ゴミ箱ボタンは追加しない
            ruler.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('resize-handle')) {
                    isResizing = true;
                    resizeHandle = e.target.classList[1];
                } else if (!e.target.classList.contains('copy-button') && 
                        !e.target.classList.contains('close-button')) {
                    isDragging = true;
                }
                
                startX = e.clientX;
                startY = e.clientY;
                
                const onMouseMove = (e) => {
                    const deltaX = e.clientX - startX;
                    const deltaY = e.clientY - startY;
                    
                    if (isDragging) {
                        const rect = ruler.getBoundingClientRect();
                        ruler.style.left = (rect.left + deltaX) + 'px';
                        ruler.style.top = (rect.top + deltaY) + 'px';
                    } else if (isResizing) {
                        this.handleResizeForCopy(ruler, deltaX, deltaY, resizeHandle);
                    }
                    
                    startX = e.clientX;
                    startY = e.clientY;
                    this.updateLabelForCopy(ruler);
                };

                const onMouseUp = () => {
                    isDragging = false;
                    isResizing = false;
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.preventDefault();
            });
        }

        // コピーした定規から更にコピーする機能
        copySpecificRuler(originalRuler) {
            const rect = originalRuler.getBoundingClientRect();
            const newRuler = originalRuler.cloneNode(true);
            
            const copyId = 'object-ruler-copy-' + Date.now();
            newRuler.id = copyId;
            newRuler.style.left = (rect.left + 20) + 'px';
            newRuler.style.top = (rect.top + 20) + 'px';
            
            document.body.appendChild(newRuler);
            this.copiedRulers.push(newRuler);
            this.setupCopyRulerEvents(newRuler);
            
            showNotification('定規をコピーしました', 'success');
        }

        handleResizeForCopy(ruler, deltaX, deltaY, resizeHandle) {
            const rect = ruler.getBoundingClientRect();
            let newWidth = rect.width;
            let newHeight = rect.height;
            let newLeft = rect.left;
            let newTop = rect.top;
            
            switch (resizeHandle) {
                case 'se':
                    newWidth += deltaX;
                    newHeight += deltaY;
                    break;
                case 'sw':
                    newWidth -= deltaX;
                    newHeight += deltaY;
                    newLeft += deltaX;
                    break;
                case 'ne':
                    newWidth += deltaX;
                    newHeight -= deltaY;
                    newTop += deltaY;
                    break;
                case 'nw':
                    newWidth -= deltaX;
                    newHeight -= deltaY;
                    newLeft += deltaX;
                    newTop += deltaY;
                    break;
                case 'e':
                    newWidth += deltaX;
                    break;
                case 'w':
                    newWidth -= deltaX;
                    newLeft += deltaX;
                    break;
                case 's':
                    newHeight += deltaY;
                    break;
                case 'n':
                    newHeight -= deltaY;
                    newTop += deltaY;
                    break;
            }
            
            newWidth = Math.max(20, newWidth);
            newHeight = Math.max(20, newHeight);
            
            ruler.style.width = newWidth + 'px';
            ruler.style.height = newHeight + 'px';
            ruler.style.left = newLeft + 'px';
            ruler.style.top = newTop + 'px';
        }

        updateLabelForCopy(ruler) {
            const rect = ruler.getBoundingClientRect();
            const label = ruler.querySelector('.ruler-label');
            if (label) {
                label.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}px`;
            }
        }

        onMouseMove(e) {
            if (!this.isActive || !this.ruler) return;
            
            const deltaX = e.clientX - this.startX;
            const deltaY = e.clientY - this.startY;
            
            if (this.isDragging) {
                const rect = this.ruler.getBoundingClientRect();
                this.ruler.style.left = (rect.left + deltaX) + 'px';
                this.ruler.style.top = (rect.top + deltaY) + 'px';
            } else if (this.isResizing) {
                this.handleResize(deltaX, deltaY);
            }
            
            this.startX = e.clientX;
            this.startY = e.clientY;
            this.updateLabel();
        }

        handleResize(deltaX, deltaY) {
            const rect = this.ruler.getBoundingClientRect();
            let newWidth = rect.width;
            let newHeight = rect.height;
            let newLeft = rect.left;
            let newTop = rect.top;
            
            switch (this.resizeHandle) {
                case 'se':
                    newWidth += deltaX;
                    newHeight += deltaY;
                    break;
                case 'sw':
                    newWidth -= deltaX;
                    newHeight += deltaY;
                    newLeft += deltaX;
                    break;
                case 'ne':
                    newWidth += deltaX;
                    newHeight -= deltaY;
                    newTop += deltaY;
                    break;
                case 'nw':
                    newWidth -= deltaX;
                    newHeight -= deltaY;
                    newLeft += deltaX;
                    newTop += deltaY;
                    break;
                case 'e':
                    newWidth += deltaX;
                    break;
                case 'w':
                    newWidth -= deltaX;
                    newLeft += deltaX;
                    break;
                case 's':
                    newHeight += deltaY;
                    break;
                case 'n':
                    newHeight -= deltaY;
                    newTop += deltaY;
                    break;
            }
            
            newWidth = Math.max(20, newWidth);
            newHeight = Math.max(20, newHeight);
            
            this.ruler.style.width = newWidth + 'px';
            this.ruler.style.height = newHeight + 'px';
            this.ruler.style.left = newLeft + 'px';
            this.ruler.style.top = newTop + 'px';
        }

        onMouseUp() {
            if (!this.isActive) return;
            
            this.isDragging = false;
            this.isResizing = false;
            document.removeEventListener('mousemove', this.boundOnMouseMove);
            document.removeEventListener('mouseup', this.boundOnMouseUp);
        }

        updateLabel() {
            if (!this.ruler) return;
            const rect = this.ruler.getBoundingClientRect();
            const label = this.ruler.querySelector('.ruler-label');
            label.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}px`;
        }

        removeRuler() {
            const existing = document.getElementById('object-ruler');
            if (existing) existing.remove();
        }

        removeAllCopiedRulers() {
            this.copiedRulers.forEach(ruler => {
                if (ruler.parentNode) ruler.remove();
            });
            this.copiedRulers = [];
        }
    }

    // レイアウト可視化ツール
    class LayoutVisualizer {
        constructor() {
            this.isActive = false;
            this.overlays = [];
            this.elements = [];
            this.boundUpdatePositions = this.updateOverlayPositions.bind(this);
        }

        activate() {
            this.isActive = true;
            this.createLayoutOverlays();
            this.showInstructions();
            
            window.addEventListener('scroll', this.boundUpdatePositions);
            window.addEventListener('resize', this.boundUpdatePositions);
        }

        deactivate() {
            this.isActive = false;
            this.removeAllOverlays();
            this.hideInstructions();
            
            window.removeEventListener('scroll', this.boundUpdatePositions);
            window.removeEventListener('resize', this.boundUpdatePositions);
        }

        showInstructions() {
            const instructions = document.createElement('div');
            instructions.id = 'layout-instructions';
            instructions.innerHTML = `
                <div>レイアウト構造を可視化中</div>
                <button onclick="window.layoutVisualizer.deactivate()" style="
                    background: #dc3545; 
                    color: white; 
                    border: none; 
                    padding: 4px 8px; 
                    border-radius: 3px; 
                    cursor: pointer; 
                    font-size: 11px;
                    margin-top: 5px;
                ">✖ 閉じる</button>
            `;
            instructions.style.cssText = `
                position: fixed;
                top: 60px;
                right: 20px;
                background: #333;
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 1000000;
            `;
            document.body.appendChild(instructions);
        }

        hideInstructions() {
            const instructions = document.getElementById('layout-instructions');
            if (instructions) instructions.remove();
        }

        createLayoutOverlays() {
            this.removeAllOverlays();
            this.elements = [];
            
            this.detectMainContent();
            this.detectGridContainers();
            this.detectFlexContainers();
            this.detectSections();
        }

        detectMainContent() {
            const selectors = [
                'main', '[role="main"]', '.main', '#main',
                '.container', '.content', '.wrapper',
                'article', '.article'
            ];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                        this.createOverlay(element, 'main-content', '#007bff', 'メインコンテンツ');
                    }
                });
            });
        }

        detectGridContainers() {
            const elements = document.querySelectorAll('*');
            elements.forEach(element => {
                const style = window.getComputedStyle(element);
                if (style.display === 'grid') {
                    this.createOverlay(element, 'grid-container', '#28a745', 'Grid Container');
                    this.highlightGridItems(element);
                }
            });
        }

        detectFlexContainers() {
            const elements = document.querySelectorAll('*');
            elements.forEach(element => {
                const style = window.getComputedStyle(element);
                if (style.display === 'flex' || style.display === 'inline-flex') {
                    this.createOverlay(element, 'flex-container', '#ffc107', 'Flex Container');
                }
            });
        }

        detectSections() {
            const selectors = [
                'header', 'nav', 'section', 'aside', 'footer',
                '.header', '.nav', '.sidebar', '.footer'
            ];
            
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element.offsetWidth > 0 && element.offsetHeight > 0) {
                        this.createOverlay(element, 'section', '#dc3545', element.tagName.toLowerCase());
                    }
                });
            });
        }

        highlightGridItems(gridContainer) {
            const children = Array.from(gridContainer.children);
            children.forEach((child, index) => {
                this.createOverlay(child, 'grid-item', '#17a2b8', `Grid Item ${index + 1}`);
            });
        }

        createOverlay(element, type, color, label) {
            const rect = element.getBoundingClientRect();
            
            const overlay = document.createElement('div');
            overlay.className = `layout-overlay ${type}`;
            overlay.innerHTML = `
                <div class="overlay-label">${label}</div>
                <div class="overlay-info">${Math.round(rect.width)}×${Math.round(rect.height)}</div>
            `;
            
            overlay.style.cssText = `
                position: fixed;
                left: ${rect.left}px;
                top: ${rect.top}px;
                width: ${rect.width}px;
                height: ${rect.height}px;
                border: 2px solid ${color};
                background: ${color}15;
                z-index: 999997;
                pointer-events: none;
            `;

            this.elements.push({
                element: element,
                overlay: overlay,
                color: color,
                label: label
            });

            const style = document.createElement('style');
            style.textContent = `
                .layout-overlay .overlay-label {
                    position: absolute;
                    top: -25px;
                    left: 0;
                    background: ${color};
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-family: monospace;
                    white-space: nowrap;
                }
                .layout-overlay .overlay-info {
                    position: absolute;
                    bottom: -20px;
                    right: 0;
                    background: ${color};
                    color: white;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-size: 10px;
                    font-family: monospace;
                }
            `;
            if (!document.querySelector('style[data-layout-style]')) {
                style.setAttribute('data-layout-style', 'true');
                document.head.appendChild(style);
            }
            
            document.body.appendChild(overlay);
            this.overlays.push(overlay);
        }

        updateOverlayPositions() {
            this.elements.forEach(item => {
                const { element, overlay } = item;
                
                if (!document.contains(element)) {
                    if (overlay.parentNode) overlay.remove();
                    return;
                }
                
                const rect = element.getBoundingClientRect();
                
                if (rect.bottom < 0 || rect.top > window.innerHeight || 
                    rect.right < 0 || rect.left > window.innerWidth) {
                    overlay.style.display = 'none';
                } else {
                    overlay.style.display = 'block';
                    overlay.style.left = rect.left + 'px';
                    overlay.style.top = rect.top + 'px';
                    overlay.style.width = rect.width + 'px';
                    overlay.style.height = rect.height + 'px';
                    
                    const infoElement = overlay.querySelector('.overlay-info');
                    if (infoElement) {
                        infoElement.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)}`;
                    }
                }
            });
        }

        removeAllOverlays() {
            this.overlays.forEach(overlay => {
                if (overlay.parentNode) overlay.remove();
            });
            this.overlays = [];
            this.elements = [];
        }
    }

    // ツールのアクティベーション関数
    function activateObjectRuler() {
        if (!window.objectRuler) {
            window.objectRuler = new ObjectRuler();
        }
        window.objectRuler.activate();
        showNotification('オブジェクト定規を起動しました', 'success');
    }

    function activateLayoutDisplay() {
        if (!window.layoutVisualizer) {
            window.layoutVisualizer = new LayoutVisualizer();
        }
        window.layoutVisualizer.activate();
        showNotification('レイアウト表示を起動しました', 'success');
    }

    // メニュー画面を表示
    function showMenu() {
        const menuArea = createMainUI();
        
        const buttons = [
            { id: 'check-links-list', text: '🔗 リンク', color: '#4285f4', action: () => runCheck('linksList') },
            { id: 'check-links-broken', text: '⚠️ リンク切れ', color: '#ff4444', action: () => runCheck('linksBroken') },
            { id: 'check-images', text: '🖼️ 画像', color: '#34a853', action: () => runCheck('images') },
            { id: 'batch-image-check', text: '📊 画像一括', color: '#ff6b35', action: () => showBatchImageCheck() },
            { id: 'check-meta', text: '🏷️ meta', color: '#9c27b0', action: () => runCheck('meta') },
            { id: 'batch-meta-check', text: '📊 meta一括', color: '#9c27b0', action: () => showBatchMetaCheck() },
            { id: 'check-mobile-quality', text: '📱 スマホ', color: '#e91e63', action: () => runCheck('mobileQuality') },
            { id: 'feedback-tool', text: '✏️ フィードバック', color: '#ff9800', action: () => showFeedbackTool() },
            { id: 'object-ruler', text: '📐 定規', color: '#28a745', action: () => activateObjectRuler() },
            { id: 'layout-display', text: '🏗️ レイアウト可視化', color: '#6f42c1', action: () => activateLayoutDisplay() }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.style.cssText = `
                background: ${btn.color};
                color: white;
                border: none;
                border-radius: 15px;
                padding: 6px 12px;
                font-size: 14px;
                cursor: pointer;
                font-weight: 500;
                white-space: nowrap;
                transition: transform 0.2s;
            `;
            
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.05)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
            });
            
            button.addEventListener('click', btn.action);
            menuArea.appendChild(button);
        });
    }

    function createFloatingToolArea(content) {
        const existingArea = document.getElementById('web-checker-floating-area');
        if (existingArea) {
            existingArea.remove();
        }
        
        const floatingArea = document.createElement('div');
        floatingArea.id = 'web-checker-floating-area';
        floatingArea.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 520px;
            height: 750px;
            min-width: 400px;
            min-height: 300px;
            background: white;
            border: 2px solid #4285f4;
            border-radius: 10px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            z-index: 999998;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // リサイズハンドル（左下角）
        const resizeHandle = document.createElement('div');
        resizeHandle.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 20px;
            height: 20px;
            background: linear-gradient(45deg, transparent 30%, #4285f4 30%, #4285f4 40%, transparent 40%, transparent 60%, #4285f4 60%, #4285f4 70%, transparent 70%);
            cursor: ne-resize;
            z-index: 10;
            border-radius: 0 0 0 8px;
        `;
        
        // リサイズ機能
        let isResizing = false;
        let startX, startY, startWidth, startHeight, startLeft;

        resizeHandle.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            startWidth = parseInt(document.defaultView.getComputedStyle(floatingArea).width, 10);
            startHeight = parseInt(document.defaultView.getComputedStyle(floatingArea).height, 10);
            startLeft = parseInt(document.defaultView.getComputedStyle(floatingArea).left, 10);
            document.body.style.cursor = 'ne-resize';
            e.preventDefault();
            
            function onMouseMove(e) {
                if (!isResizing) return;
                
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                
                const newWidth = startWidth - deltaX;
                const newHeight = startHeight + deltaY;
                const newLeft = startLeft + deltaX;
                
                const minWidth = 400;
                const minHeight = 300;
                const maxWidth = window.innerWidth - 40;
                const maxHeight = window.innerHeight - 120;
                
                const finalWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
                const finalHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
                const finalLeft = Math.max(0, Math.min(newLeft, window.innerWidth - finalWidth));
                
                floatingArea.style.width = finalWidth + 'px';
                floatingArea.style.height = finalHeight + 'px';
                floatingArea.style.left = finalLeft + 'px';
            }
            
            function onMouseUp() {
                isResizing = false;
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
        
        // ドラッグ可能なヘッダー
        const header = document.createElement('div');
        header.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-bottom: 1px solid #ddd;
            padding: 12px 15px;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
            border-radius: 8px 8px 0 0;
            flex-shrink: 0;
        `;
        
        const headerTitle = document.createElement('span');
        headerTitle.textContent = '📊 検証結果';
        headerTitle.style.cssText = `
            font-weight: 600;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            font-size: 14px;
        `;
        
        const headerControls = document.createElement('div');
        headerControls.style.cssText = `
            display: flex;
            gap: 8px;
            align-items: center;
        `;
        
        // 最小化ボタン
        const minimizeBtn = document.createElement('button');
        minimizeBtn.textContent = '−';
        minimizeBtn.title = '最小化';
        minimizeBtn.style.cssText = `
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            border-radius: 3px;
            width: 24px;
            height: 24px;
            font-size: 14px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.2s;
        `;
        
        let isMinimized = false;
        let originalHeight = '';
        
        minimizeBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            if (isMinimized) {
                originalHeight = floatingArea.style.height;
                floatingArea.style.height = '50px';
                contentArea.style.display = 'none';
                resizeHandle.style.display = 'none';
                minimizeBtn.textContent = '+';
                minimizeBtn.title = '展開';
            } else {
                floatingArea.style.height = originalHeight;
                contentArea.style.display = 'block';
                resizeHandle.style.display = 'block';
                minimizeBtn.textContent = '−';
                minimizeBtn.title = '最小化';
            }
        });
        
        // 閉じるボタン
        const closeFloatingBtn = document.createElement('button');
        closeFloatingBtn.textContent = '×';
        closeFloatingBtn.style.cssText = `
            background: rgba(255,68,68,0.8);
            color: white;
            border: none;
            border-radius: 3px;
            width: 24px;
            height: 24px;
            font-size: 14px;
            cursor: pointer;
            font-weight: bold;
            transition: background 0.2s;
        `;
        
        closeFloatingBtn.addEventListener('click', () => {
            floatingArea.remove();
        });
        
        // コンテンツエリア
        const contentArea = document.createElement('div');
        contentArea.style.cssText = `
            padding: 20px;
            overflow-y: auto;
            flex: 1;
            font-size: 14px;
            line-height: 1.5;
        `;
        contentArea.innerHTML = content;
        
        headerControls.appendChild(minimizeBtn);
        headerControls.appendChild(closeFloatingBtn);
        header.appendChild(headerTitle);
        header.appendChild(headerControls);
        floatingArea.appendChild(header);
        floatingArea.appendChild(contentArea);
        floatingArea.appendChild(resizeHandle);
        
        // ドラッグ機能
        let isDragging = false;
        let offset = { x: 0, y: 0 };
        
        header.addEventListener('mousedown', (e) => {
            if (e.target === resizeHandle) return;
            
            isDragging = true;
            offset.x = e.clientX - floatingArea.offsetLeft;
            offset.y = e.clientY - floatingArea.offsetTop;
            header.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const newX = Math.max(0, Math.min(window.innerWidth - floatingArea.offsetWidth, e.clientX - offset.x));
                const newY = Math.max(0, Math.min(window.innerHeight - floatingArea.offsetHeight, e.clientY - offset.y));
                
                floatingArea.style.left = newX + 'px';
                floatingArea.style.top = newY + 'px';
                floatingArea.style.right = 'auto';
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            header.style.cursor = 'move';
        });
        
        document.body.appendChild(floatingArea);
        return contentArea;
    }

    // metaタグ一括チェック画面を表示
    function showBatchMetaCheck() {
        
        const batchHTML = `
            <h4 style="margin: 0 0 20px 0; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; font-size: 18px; font-weight: 600;">
                📊 metaタグ一括チェック
            </h4>
            
            <div style="margin-bottom: 15px;">
                <label style="font-weight: bold; display: block; margin-bottom: 8px;">調査対象URL（1行1URL）:</label>
                <textarea id="batch-meta-urls" placeholder="調査したいURLを1行ずつ入力してください&#10;例：&#10;https://example.com&#10;https://example.com/page1&#10;https://example.com/page2" 
                        style="width: 100%; height: 150px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 12px; resize: vertical;"></textarea>
                <small style="color: #666; font-size: 13px;">※ 各URLは改行で区切ってください</small>
            </div>
            
            <div style="margin-bottom: 20px;">
                <button id="start-batch-meta-check" style="
                    width: 100%; 
                    padding: 12px; 
                    background: #9c27b0; 
                    color: white; 
                    border: none; 
                    border-radius: 5px; 
                    font-size: 14px; 
                    cursor: pointer;
                    font-weight: 500;
                ">
                    🚀 一括チェック開始
                </button>
            </div>
            
            <div id="batch-meta-progress" style="display: none;">
                <h5 style="color: #333; margin: 15px 0 10px 0;">📈 進捗状況</h5>
                <div id="meta-progress-bar-container" style="background: #f0f0f0; border-radius: 10px; height: 20px; margin: 10px 0; overflow: hidden;">
                    <div id="meta-progress-bar" style="background: #9c27b0; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <div id="meta-progress-text" style="font-size: 12px; color: #666; margin-bottom: 15px;">準備中...</div>
                <div id="meta-progress-details" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 5px; background: #f9f9f9; font-size: 13px;"></div>
            </div>
            
            <div id="batch-meta-results" style="display: none;">
                <button id="export-meta-excel" style="
                    width: 100%; 
                    padding: 12px; 
                    background: #28a745; 
                    color: white; 
                    border: none; 
                    border-radius: 5px; 
                    font-size: 14px; 
                    cursor: pointer;
                    font-weight: 500;
                    margin: 15px 0;
                " disabled>
                    📥 Excel形式でダウンロード
                </button>
                <div id="meta-results-summary" style="margin-top: 15px;"></div>
            </div>
        `;
        
        // 浮いているエリアに直接表示
        createFloatingToolArea(batchHTML);
        
        // イベントリスナーの設定（少し遅延させる）
        setTimeout(() => {
            const startButton = document.getElementById('start-batch-meta-check');
            if (startButton) {
                startButton.addEventListener('click', startBatchMetaCheck);
            }
            
            const exportButton = document.getElementById('export-meta-excel');
            if (exportButton) {
                exportButton.addEventListener('click', exportBatchMetaResultsToExcel);
            }
        }, 100);
    }

    // metaタグ一括チェック開始
    async function startBatchMetaCheck() {
        const urlsText = document.getElementById('batch-meta-urls').value.trim();
        if (!urlsText) {
            alert('URLを入力してください');
            return;
        }
        
        const urls = urlsText.split('\n').map(url => url.trim()).filter(url => url);
        if (urls.length === 0) {
            alert('有効なURLを入力してください');
            return;
        }
        
        // UI更新
        document.getElementById('batch-meta-progress').style.display = 'block';
        document.getElementById('start-batch-meta-check').disabled = true;
        document.getElementById('start-batch-meta-check').textContent = '処理中...';
        
        const progressBar = document.getElementById('meta-progress-bar');
        const progressText = document.getElementById('meta-progress-text');
        const progressDetails = document.getElementById('meta-progress-details');
        
        const allResults = [];
        
        try {
            // SheetJSライブラリを読み込み
            await loadSheetJS();
            
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                const progress = Math.round(((i + 1) / urls.length) * 100);
                
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${i + 1}/${urls.length} 処理中: ${url}`;
                
                try {
                    const result = await checkSingleURLMeta(url);
                    allResults.push(result);
                    
                    progressDetails.innerHTML += `<div style="color: green;">✅ ${url} - 完了</div>`;
                } catch (error) {
                    allResults.push({
                        url: url,
                        error: error.message,
                        meta: []
                    });
                    
                    progressDetails.innerHTML += `<div style="color: red;">❌ ${url} - エラー: ${error.message}</div>`;
                }
                
                // スクロールを最下部に
                progressDetails.scrollTop = progressDetails.scrollHeight;
                
                // 少し待機（サーバー負荷軽減）
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // 完了処理
            progressText.textContent = `完了！ ${urls.length}件のURL処理が終了しました`;
            document.getElementById('export-meta-excel').disabled = false;
            document.getElementById('batch-meta-results').style.display = 'block';
            
            // 結果サマリー表示
            displayBatchMetaSummary(allResults);
            
            // グローバル変数に結果を保存（Excel出力用）
            window.batchMetaCheckResults = allResults;
            
        } catch (error) {
            progressText.textContent = `エラーが発生しました: ${error.message}`;
            progressDetails.innerHTML += `<div style="color: red;">❌ 処理中断: ${error.message}</div>`;
        } finally {
            document.getElementById('start-batch-meta-check').disabled = false;
            document.getElementById('start-batch-meta-check').textContent = '🚀 一括チェック開始';
        }
        
        // Excel出力ボタンのイベント設定
        document.getElementById('export-meta-excel').addEventListener('click', exportBatchMetaResultsToExcel);
    }

    // 単一URLのmetaタグチェック
    async function checkSingleURLMeta(url) {
        return new Promise((resolve, reject) => {
            // iframeを作成して対象URLを読み込み
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            
            const timeout = setTimeout(() => {
                document.body.removeChild(iframe);
                reject(new Error('タイムアウト'));
            }, 10000); // 10秒でタイムアウト
            
            iframe.onload = function() {
                try {
                    clearTimeout(timeout);
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    
                    // metaタグを取得
                    const targetMetas = [
                        'canonical',
                        'title', 
                        'description',
                        'keywords',
                        'og:site_name',
                        'og:title', 
                        'og:description',
                        'og:url'
                    ];
                    
                    const metaResults = [];
                    
                    targetMetas.forEach(metaName => {
                        let content = '';
                        let element = null;
                        let status = 'OK';
                        let warning = '';
                        
                        if (metaName === 'canonical') {
                            element = iframeDoc.querySelector('link[rel="canonical"]');
                            content = element ? element.href : '';
                            
                            if (content) {
                                // canonical検証ロジック
                                const currentUrlClean = normalizeUrl(url);
                                const canonicalUrlClean = normalizeUrl(content);
                                
                                if (currentUrlClean !== canonicalUrlClean) {
                                    status = 'WARNING';
                                    warning = `現在のURL: ${currentUrlClean} | canonical: ${canonicalUrlClean}`;
                                }
                            } else {
                                status = 'MISSING';
                            }
                            
                        } else if (metaName === 'title') {
                            content = iframeDoc.title;
                        } else if (metaName.startsWith('og:')) {
                            element = iframeDoc.querySelector(`meta[property="${metaName}"]`);
                            content = element ? element.content : '';
                        } else {
                            element = iframeDoc.querySelector(`meta[name="${metaName}"]`);
                            content = element ? element.content : '';
                        }
                        
                        // 一般的なmetaタグのステータス判定
                        if (metaName !== 'canonical' && !content) {
                            status = 'MISSING';
                        }
                        
                        metaResults.push({
                            url: url,
                            name: metaName,
                            content: content || '[設定なし]',
                            length: content ? content.length : 0,
                            status: status,
                            warning: warning
                        });
                    });
                    
                    document.body.removeChild(iframe);
                    resolve({
                        url: url,
                        meta: metaResults,
                        timestamp: new Date().toLocaleString()
                    });
                    
                } catch (error) {
                    clearTimeout(timeout);
                    document.body.removeChild(iframe);
                    reject(error);
                }
            };
            
            iframe.onerror = function() {
                clearTimeout(timeout);
                document.body.removeChild(iframe);
                reject(new Error('ページの読み込みに失敗しました'));
            };
            
            document.body.appendChild(iframe);
        });
    }

    // metaタグバッチ結果サマリー表示
    function displayBatchMetaSummary(results) {
        const summaryDiv = document.getElementById('meta-results-summary');
        
        const totalUrls = results.length;
        const successUrls = results.filter(r => !r.error).length;
        
        summaryDiv.innerHTML = `
            <h5 style="color: #333; margin: 0 0 10px 0;">📊 処理結果サマリー</h5>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-size: 12px;">
                <div style="margin-bottom: 8px;"><strong>処理URL数:</strong> ${totalUrls}件</div>
                <div style="margin-bottom: 8px;"><strong>成功:</strong> ${successUrls}件</div>
                <div><strong>失敗:</strong> ${totalUrls - successUrls}件</div>
            </div>
        `;
    }

    // metaタグ結果をExcel形式でエクスポート
    function exportBatchMetaResultsToExcel() {
        if (!window.batchMetaCheckResults) {
            alert('エクスポートするデータがありません');
            return;
        }
        
        try {
            const workbook = XLSX.utils.book_new();
            
            // metaタグ一覧シート
            const metaData = [];
            window.batchMetaCheckResults.forEach(result => {
                if (result.meta && result.meta.length > 0) {
                    result.meta.forEach(meta => {
                        metaData.push({
                            'URL': meta.url,
                            'metaタグ名': meta.name,
                            '内容': meta.content,
                            '文字数': meta.length,
                            '状態': meta.status,
                            '警告': meta.warning || '-',
                            '調査日時': result.timestamp
                        });
                    });
                } else if (result.error) {
                    metaData.push({
                        'URL': result.url,
                        'metaタグ名': 'エラー',
                        '内容': '-',
                        '文字数': 0,
                        '状態': 'ERROR',
                        '警告': '-',
                        '調査日時': new Date().toLocaleString(),
                        'エラー内容': result.error
                    });
                }
            });
            
            const metaSheet = XLSX.utils.json_to_sheet(metaData);
            XLSX.utils.book_append_sheet(workbook, metaSheet, "metaタグ一覧");
            
            // サマリーシート
            const summaryData = window.batchMetaCheckResults.map(result => ({
                'URL': result.url,
                '処理結果': result.error ? 'エラー' : '成功',
                'エラー内容': result.error || '-',
                '調査日時': result.timestamp || new Date().toLocaleString()
            }));
            
            const summarySheet = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, "調査サマリー");
            
            // ファイル名生成
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-T]/g, '');
            const filename = `metaタグ一括調査結果_${timestamp}.xlsx`;
            
            // ダウンロード
            XLSX.writeFile(workbook, filename);
            
            alert(`Excel ファイル "${filename}" をダウンロードしました！`);
            
        } catch (error) {
            alert(`Excel出力でエラーが発生しました: ${error.message}`);
            console.error('Excel export error:', error);
        }
    }

    // 画像一括チェック画面を表示
    function showBatchImageCheck() {
        const batchHTML = `
            <h4 style="margin: 0 0 20px 0; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; font-size: 18px; font-weight: 600;">
                📊 画像一括チェック
            </h4>
            
            <div style="margin-bottom: 15px;">
                <label style="font-weight: bold; display: block; margin-bottom: 8px;">調査対象URL（1行1URL）:</label>
                <textarea id="batch-urls" placeholder="調査したいURLを1行ずつ入力してください&#10;例：&#10;https://example.com&#10;https://example.com/page1&#10;https://example.com/page2" 
                        style="width: 100%; height: 150px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-size: 12px; resize: vertical;"></textarea>
                <small style="color: #666; font-size: 13px;">※ 各URLは改行で区切ってください</small>
            </div>
            
            <div style="margin-bottom: 20px;">
                <button id="start-batch-check" style="
                    width: 100%; 
                    padding: 12px; 
                    background: #ff6b35; 
                    color: white; 
                    border: none; 
                    border-radius: 5px; 
                    font-size: 14px; 
                    cursor: pointer;
                    font-weight: 500;
                ">
                    🚀 一括チェック開始
                </button>
            </div>
            
            <div id="batch-progress" style="display: none;">
                <h5 style="color: #333; margin: 15px 0 10px 0;">📈 進捗状況</h5>
                <div id="progress-bar-container" style="background: #f0f0f0; border-radius: 10px; height: 20px; margin: 10px 0; overflow: hidden;">
                    <div id="progress-bar" style="background: #4285f4; height: 100%; width: 0%; transition: width 0.3s ease;"></div>
                </div>
                <div id="progress-text" style="font-size: 12px; color: #666; margin-bottom: 15px;">準備中...</div>
                <div id="progress-details" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 5px; background: #f9f9f9; font-size: 13px;"></div>
            </div>
            
            <div id="batch-results" style="display: none;">
                <button id="export-excel" style="
                    width: 100%; 
                    padding: 12px; 
                    background: #28a745; 
                    color: white; 
                    border: none; 
                    border-radius: 5px; 
                    font-size: 14px; 
                    cursor: pointer;
                    font-weight: 500;
                    margin: 15px 0;
                " disabled>
                    📥 Excel形式でダウンロード
                </button>
                <div id="results-summary" style="margin-top: 15px;"></div>
            </div>
        `;
        
        // 浮いているエリアに直接表示
        createFloatingToolArea(batchHTML);
        
        // イベントリスナーの設定（少し遅延させる）
        setTimeout(() => {
            const startButton = document.getElementById('start-batch-check');
            if (startButton) {
                startButton.addEventListener('click', startBatchCheck);
            }
            
            const exportButton = document.getElementById('export-excel');
            if (exportButton) {
                exportButton.addEventListener('click', exportBatchResultsToExcel);
            }
        }, 100);
    }
    // リンク一覧のみ取得（リンク切れチェックなし）
    async function getBodyLinksOnly() {
        const mainElement = document.querySelector('main');
        let bodyLinks;
        
        if (!mainElement) {
            bodyLinks = Array.from(document.body.querySelectorAll('a[href]'));
        } else {
            bodyLinks = Array.from(mainElement.querySelectorAll('a[href]'));
        }
        
        const results = [];
        
        for (let i = 0; i < bodyLinks.length; i++) {
            const link = bodyLinks[i];
            const href = link.href;
            const linkText = link.textContent.trim() || '[テキストなし]';
            
            // 要素にユニークIDを付与
            if (!link.id) {
                link.id = `web-checker-link-${i}`;
            }
            
            results.push({
                text: linkText,
                href: href,
                target: link.target || '_self',
                elementId: link.id,
                index: i + 1
            });
        }
        
        return results;
    }

    // 一括チェック開始
    async function startBatchCheck() {
        const urlsText = document.getElementById('batch-urls').value.trim();
        if (!urlsText) {
            alert('URLを入力してください');
            return;
        }
        
        const urls = urlsText.split('\n').map(url => url.trim()).filter(url => url);
        if (urls.length === 0) {
            alert('有効なURLを入力してください');
            return;
        }
        
        // UI更新
        document.getElementById('batch-progress').style.display = 'block';
        document.getElementById('start-batch-check').disabled = true;
        document.getElementById('start-batch-check').textContent = '処理中...';
        
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        const progressDetails = document.getElementById('progress-details');
        
        const allResults = [];
        
        try {
            // SheetJSライブラリを読み込み
            await loadSheetJS();
            
            for (let i = 0; i < urls.length; i++) {
                const url = urls[i];
                const progress = Math.round(((i + 1) / urls.length) * 100);
                
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${i + 1}/${urls.length} 処理中: ${url}`;
                
                try {
                    const result = await checkSingleURL(url);
                    allResults.push(result);
                    
                    progressDetails.innerHTML += `<div style="color: green;">✅ ${url} - 完了 (画像${result.images.length}件)</div>`;
                } catch (error) {
                    allResults.push({
                        url: url,
                        error: error.message,
                        images: []
                    });
                    
                    progressDetails.innerHTML += `<div style="color: red;">❌ ${url} - エラー: ${error.message}</div>`;
                }
                
                // スクロールを最下部に
                progressDetails.scrollTop = progressDetails.scrollHeight;
                
                // 少し待機（サーバー負荷軽減）
                await new Promise(resolve => setTimeout(resolve, 500));
            }
            
            // 完了処理
            progressText.textContent = `完了！ ${urls.length}件のURL処理が終了しました`;
            document.getElementById('export-excel').disabled = false;
            document.getElementById('batch-results').style.display = 'block';
            
            // 結果サマリー表示
            displayBatchSummary(allResults);
            
            // グローバル変数に結果を保存（Excel出力用）
            window.batchCheckResults = allResults;
            
        } catch (error) {
            progressText.textContent = `エラーが発生しました: ${error.message}`;
            progressDetails.innerHTML += `<div style="color: red;">❌ 処理中断: ${error.message}</div>`;
        } finally {
            document.getElementById('start-batch-check').disabled = false;
            document.getElementById('start-batch-check').textContent = '🚀 一括チェック開始';
        }
        
        // Excel出力ボタンのイベント設定
        document.getElementById('export-excel').addEventListener('click', exportBatchResultsToExcel);
    }

    // 単一URLの画像チェック
    async function checkSingleURL(url) {
        return new Promise((resolve, reject) => {
            // iframeを作成して対象URLを読み込み
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = url;
            
            const timeout = setTimeout(() => {
                document.body.removeChild(iframe);
                reject(new Error('タイムアウト'));
            }, 10000); // 10秒でタイムアウト
            
            iframe.onload = async function() {
                try {
                    clearTimeout(timeout);
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    
                    // 画像を取得
                    const mainElement = iframeDoc.querySelector('main');
                    let images;
                    if (!mainElement) {
                        images = Array.from(iframeDoc.body.querySelectorAll('img'));
                    } else {
                        images = Array.from(mainElement.querySelectorAll('img'));
                    }
                    const imageResults = [];
                    
                    for (let i = 0; i < images.length; i++) {
                        const img = images[i];
                        
                        imageResults.push({
                            url: url,
                            index: i + 1,
                            src: img.src,
                            alt: img.alt || '[ALTなし]',
                            width: img.naturalWidth || img.width || 'unknown',
                            height: img.naturalHeight || img.height || 'unknown',
                            loading: img.loading || 'eager',
                            fileName: img.src.split('/').pop() || 'unknown'
                        });
                    }
                    
                    document.body.removeChild(iframe);
                    resolve({
                        url: url,
                        images: imageResults,
                        timestamp: new Date().toLocaleString()
                    });
                    
                } catch (error) {
                    clearTimeout(timeout);
                    document.body.removeChild(iframe);
                    reject(error);
                }
            };
            
            iframe.onerror = function() {
                clearTimeout(timeout);
                document.body.removeChild(iframe);
                reject(new Error('ページの読み込みに失敗しました'));
            };
            
            document.body.appendChild(iframe);
        });
    }

    // バッチ結果サマリー表示
    function displayBatchSummary(results) {
        const summaryDiv = document.getElementById('results-summary');
        
        const totalUrls = results.length;
        const successUrls = results.filter(r => !r.error).length;
        const totalImages = results.reduce((sum, r) => sum + (r.images ? r.images.length : 0), 0);
        
        summaryDiv.innerHTML = `
            <h5 style="color: #333; margin: 0 0 10px 0;">📊 処理結果サマリー</h5>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; font-size: 12px;">
                <div style="margin-bottom: 8px;"><strong>処理URL数:</strong> ${totalUrls}件</div>
                <div style="margin-bottom: 8px;"><strong>成功:</strong> ${successUrls}件</div>
                <div style="margin-bottom: 8px;"><strong>失敗:</strong> ${totalUrls - successUrls}件</div>
                <div><strong>総画像数:</strong> ${totalImages}件</div>
            </div>
        `;
    }

    // Excel形式で結果をエクスポート
    function exportBatchResultsToExcel() {
        if (!window.batchCheckResults) {
            alert('エクスポートするデータがありません');
            return;
        }
        
        try {
            const workbook = XLSX.utils.book_new();
            
            // 画像一覧シート
            const imageData = [];
            window.batchCheckResults.forEach(result => {
                if (result.images && result.images.length > 0) {
                    result.images.forEach(img => {
                        imageData.push({
                            'URL': img.url,
                            '画像No': img.index,
                            '画像パス': img.src,
                            'ファイル名': img.fileName,
                            'ALTテキスト': img.alt,
                            '幅': img.width,
                            '高さ': img.height,
                            'loading属性': img.loading,
                            '調査日時': result.timestamp
                        });
                    });
                } else if (result.error) {
                    imageData.push({
                        'URL': result.url,
                        '画像No': '-',
                        '画像パス': 'エラー',
                        'ファイル名': '-',
                        'ALTテキスト': '-',
                        '幅': '-',
                        '高さ': '-',
                        'loading属性': '-',
                        '調査日時': new Date().toLocaleString(),
                        'エラー内容': result.error
                    });
                }
            });
            
            const imageSheet = XLSX.utils.json_to_sheet(imageData);
            XLSX.utils.book_append_sheet(workbook, imageSheet, "画像一覧");
            
            // サマリーシート
            const summaryData = window.batchCheckResults.map(result => ({
                'URL': result.url,
                '処理結果': result.error ? 'エラー' : '成功',
                '画像数': result.images ? result.images.length : 0,
                'エラー内容': result.error || '-',
                '調査日時': result.timestamp || new Date().toLocaleString()
            }));
            
            const summarySheet = XLSX.utils.json_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(workbook, summarySheet, "調査サマリー");
            
            // ファイル名生成
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-T]/g, '');
            const filename = `画像一括調査結果_${timestamp}.xlsx`;
            
            // ダウンロード
            XLSX.writeFile(workbook, filename);
            
            alert(`Excel ファイル "${filename}" をダウンロードしました！`);
            
        } catch (error) {
            alert(`Excel出力でエラーが発生しました: ${error.message}`);
            console.error('Excel export error:', error);
        }
    }

    // 検証実行
    async function runCheck(type) {
        // 代わりに浮いているエリアにローディング表示
        createFloatingToolArea(`
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">🔄</div>
                <h3 style="margin: 0; color: #333;">検証中...</h3>
                <p style="margin: 10px 0 0 0; color: #666;">しばらくお待ちください。</p>
            </div>
        `);

        try {
            let results = {};
            
            if (type === 'linksList' || type === 'all') {
                results.linksList = await getBodyLinksOnly();
            }
            if (type === 'linksBroken' || type === 'all') {
                results.linksBroken = await getBodyLinks();
            }
            if (type === 'images' || type === 'all') {
                results.images = await getImages();
            }
            if (type === 'meta' || type === 'all') {
                results.meta = getMetaTags();
            }
            if (type === 'mobileQuality' || type === 'all') {
                results.mobileQuality = await checkMobileQuality();
            }

            displayResults(results, type);
        } catch (error) {
            createFloatingToolArea(`
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                    <h3 style="color: #ff4444; margin: 0;">エラーが発生しました</h3>
                    <p style="margin: 10px 0; color: #666;">${error.message}</p>
                    <button onclick="location.reload()" style="padding: 8px 15px; background: #4285f4; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 12px;">
                        ページを再読み込み
                    </button>
                </div>
            `);
        }
    }

    // テーブルスタイルの共通定義
    const tableStyle = `
        width: 100%; 
        border-collapse: collapse; 
        margin: 10px 0; 
        border: 2px solid #000;
    `;

    const cellStyle = `
        border: 1px solid #000; 
        padding: 10px; 
        text-align: left;
        font-size: 13px;
    `;

    const headerStyle = `
        border: 1px solid #000; 
        padding: 10px; 
        background: #f0f0f0; 
        font-weight: bold;
        font-size: 14px;
    `;

    // 1. リンク取得とリンク切れチェック
    async function getBodyLinks() {
        const mainElement = document.querySelector('main');
        let bodyLinks;
        
        if (!mainElement) {
            bodyLinks = Array.from(document.body.querySelectorAll('a[href]'));
        } else {
            bodyLinks = Array.from(mainElement.querySelectorAll('a[href]'));
        }
        
        const results = [];
        
        for (let i = 0; i < bodyLinks.length; i++) {
            const link = bodyLinks[i];
            const href = link.href;
            const linkText = link.textContent.trim() || '[テキストなし]';
            
            // 要素にユニークIDを付与
            if (!link.id) {
                link.id = `web-checker-link-${i}`;
            }
            
            if (href.startsWith('mailto:') || href.startsWith('tel:')) {
                results.push({
                    text: linkText,
                    href: href,
                    status: 'SKIP',
                    target: link.target || '_self',
                    elementId: link.id,
                    index: i + 1
                });
                continue;
            }
            
            try {
                const response = await fetch(href, { 
                    method: 'HEAD', 
                    mode: 'no-cors',
                    cache: 'no-cache'
                });
                results.push({
                    text: linkText,
                    href: href,
                    status: 'OK',
                    target: link.target || '_self',
                    elementId: link.id,
                    index: i + 1
                });
            } catch (error) {
                results.push({
                    text: linkText,
                    href: href,
                    status: 'ERROR',
                    target: link.target || '_self',
                    error: error.message,
                    elementId: link.id,
                    index: i + 1
                });
            }
        }
        
        return results;
    }

    // 4. 画像一覧化
    async function getImages() {
        const mainElement = document.querySelector('main');
        let images;
        
        if (!mainElement) {
            images = Array.from(document.body.querySelectorAll('img'));
        } else {
            images = Array.from(mainElement.querySelectorAll('img'));
        }
        
        const results = [];
        
        for (let i = 0; i < images.length; i++) {
            const img = images[i];
            
            results.push({
                index: i + 1,
                src: img.src,
                alt: img.alt || '[ALTなし]',
                width: img.naturalWidth || img.width || 'unknown',
                height: img.naturalHeight || img.height || 'unknown',
                loading: img.loading || 'eager',
                element: img // 要素参照を保持
            });
        }
        
        return results;
    }

    // 5. metaタグ一覧化
    function getMetaTags() {
        const targetMetas = [
            'canonical',
            'title', 
            'description',
            'keywords',
            'og:site_name',
            'og:title', 
            'og:description',
            'og:url'
        ];
        
        const results = [];
        
        targetMetas.forEach(metaName => {
            let content = '';
            let element = null;
            let status = 'OK';
            let warning = '';
            
            if (metaName === 'canonical') {
                element = document.querySelector('link[rel="canonical"]');
                content = element ? element.href : '';
                
                if (content) {
                    // canonical検証ロジック
                    const currentUrl = window.location.href;
                    const currentUrlClean = normalizeUrl(currentUrl);
                    const canonicalUrlClean = normalizeUrl(content);
                    
                    if (currentUrlClean !== canonicalUrlClean) {
                        status = 'WARNING';
                        warning = `現在のURL: ${currentUrlClean} | canonical: ${canonicalUrlClean}`;
                    }
                } else {
                    status = 'MISSING';
                }
                
            } else if (metaName === 'title') {
                content = document.title;
            } else if (metaName.startsWith('og:')) {
                element = document.querySelector(`meta[property="${metaName}"]`);
                content = element ? element.content : '';
            } else {
                element = document.querySelector(`meta[name="${metaName}"]`);
                content = element ? element.content : '';
            }
            
            // 一般的なmetaタグのステータス判定
            if (metaName !== 'canonical' && !content) {
                status = 'MISSING';
            }
            
            results.push({
                name: metaName,
                content: content || '[設定なし]',
                length: content ? content.length : 0,
                status: status,
                warning: warning
            });
        });
        
        return results;
    }

    // URL正規化関数
    function normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            
            // プロトコルをhttpsに統一
            urlObj.protocol = 'https:';
            
            // 末尾のスラッシュを除去
            let pathname = urlObj.pathname;
            if (pathname.endsWith('/') && pathname !== '/') {
                pathname = pathname.slice(0, -1);
            }
            urlObj.pathname = pathname;
            
            // パラメータとハッシュを除去して比較
            urlObj.search = '';
            urlObj.hash = '';
            
            return urlObj.toString();
        } catch (error) {
            return url;
        }
    }

    // スマホ画面での要素見切れチェック
    function checkElementOverflow() {
        const mobileViewports = {
            'iPhone SE': 375,
            'iPhone 12/13': 390,
            'iPhone 14 Plus': 428,
            'Android (一般的)': 360
        };
        
        const issues = [];
        const currentViewport = window.innerWidth;
        
        // メイン要素をチェック対象にする
        const elementsToCheck = document.querySelectorAll(`
            main *, 
            .content *, 
            article *,
            section *,
            div:not([style*="display: none"]):not([hidden])
        `);
        
        elementsToCheck.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const computedStyle = getComputedStyle(element);
            
            // 非表示要素はスキップ
            if (rect.width === 0 || rect.height === 0 || computedStyle.display === 'none') {
                return;
            }
            
            // 右端が見切れている場合
            if (rect.right > currentViewport) {
                const overflowAmount = Math.round(rect.right - currentViewport);
                
                issues.push({
                    type: '右端見切れ',
                    element: getElementDescription(element),
                    elementWidth: Math.round(rect.width),
                    viewportWidth: currentViewport,
                    overflowAmount: overflowAmount,
                    severity: overflowAmount > 50 ? 'HIGH' : overflowAmount > 20 ? 'MEDIUM' : 'LOW',
                    elementId: `overflow-element-${index}`
                });
                
                // 要素にIDを付与（ハイライト用）
                if (!element.id) {
                    element.id = `overflow-element-${index}`;
                }
            }
            
            // 固定幅でスマホに適さない要素
            if (computedStyle.width && computedStyle.width.includes('px')) {
                const fixedWidth = parseInt(computedStyle.width);
                if (fixedWidth > currentViewport * 0.9) { // 画面幅の90%以上
                    issues.push({
                        type: '固定幅過大',
                        element: getElementDescription(element),
                        fixedWidth: fixedWidth,
                        viewportWidth: currentViewport,
                        recommendation: 'max-width: 100%またはレスポンシブ単位の使用を検討',
                        severity: 'MEDIUM',
                        elementId: element.id || `fixed-width-${index}`
                    });
                    
                    if (!element.id) {
                        element.id = `fixed-width-${index}`;
                    }
                }
            }
        });
        
        return {
            totalIssues: issues.length,
            currentViewport: currentViewport,
            issues: issues,
            mobileViewports: mobileViewports
        };
    }

    // 要素の説明を生成
    function getElementDescription(element) {
        let description = element.tagName.toLowerCase();
        
        if (element.className) {
            description += `.${element.className.split(' ')[0]}`;
        }
        
        if (element.id) {
            description += `#${element.id}`;
        }
        
        // テキスト内容があれば一部を表示
        const text = element.textContent.trim();
        if (text && text.length > 0) {
            description += ` "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`;
        }
        
        return description;
    }

    // スマホクオリティチェック
    function checkMobileQuality() {
        const viewports = {
            'iPhone SE': 375,
            'iPhone 12-14': 390,
            'Galaxy S21+': 414
        };
        
        const currentViewport = window.innerWidth;
        const issues = [];
        
        // 現在のビューポート幅でチェック
        const currentIssues = performDetailedMobileCheck(currentViewport);
        
        return Promise.resolve({
            currentViewport: currentViewport,
            results: {
                [`現在の画面 (${currentViewport}px)`]: {
                    width: currentViewport,
                    issues: currentIssues,
                    isCurrentViewport: true
                }
            },
            summary: generateQualitySummary({
                'current': {
                    width: currentViewport,
                    issues: currentIssues,
                    isCurrentViewport: true
                }
            }),
            recommendedViewports: viewports,
            instructions: '他の画面サイズでチェックする場合は、ブラウザのデベロッパーツール(F12)でデバイスエミュレーションを使用してください。'
        });
    }

    // 詳細なモバイルチェック(実用的)
    function performDetailedMobileCheck(viewportWidth) {
        const issues = [];
        
        // 1. ページ全体の横スクロールチェック
        const bodyWidth = document.body.scrollWidth;
        const htmlWidth = document.documentElement.scrollWidth;
        const maxWidth = Math.max(bodyWidth, htmlWidth);
        
        if (maxWidth > viewportWidth + 5) { // 5pxのマージン
            issues.push({
                type: 'ページ全体の横スクロール',
                severity: 'HIGH',
                element: 'body/html',
                elementId: 'page-overflow',
                details: `ページ全体の幅: ${maxWidth}px (ビューポート: ${viewportWidth}px)`,
                recommendation: 'ページ全体に横スクロールが発生しています。overflow-x: hidden;または要素の幅調整が必要です。',
                overflowAmount: maxWidth - viewportWidth
            });
        }
        
        // 2. 各要素の詳細チェック
        const elementsToCheck = document.querySelectorAll('main *, body > *, .container, .content, article, section, div, img, table');
        const checkedElements = new Set();
        
        elementsToCheck.forEach((element, index) => {
            // 重複チェック防止
            if (checkedElements.has(element)) return;
            checkedElements.add(element);
            
            const rect = element.getBoundingClientRect();
            const computedStyle = getComputedStyle(element);
            
            // 非表示・サイズ0の要素はスキップ
            if (rect.width === 0 || rect.height === 0 || 
                computedStyle.display === 'none' || 
                computedStyle.visibility === 'hidden') {
                return;
            }
            
            // 要素の実際の幅(スクロール含む)
            const scrollWidth = element.scrollWidth;
            const clientWidth = element.clientWidth;
            
            // 右はみ出しチェック(スクロール位置も考慮)
            const rightEdge = rect.left + rect.width + window.scrollX;
            const pageWidth = window.innerWidth + window.scrollX;
            
            if (rightEdge > pageWidth + 5) {
                const elementId = element.id || `overflow-check-${index}`;
                if (!element.id) element.id = elementId;
                
                const overflowAmount = Math.round(rightEdge - pageWidth);
                
                issues.push({
                    type: '要素右はみ出し',
                    severity: overflowAmount > 50 ? 'HIGH' : overflowAmount > 20 ? 'MEDIUM' : 'LOW',
                    element: getElementDescription(element),
                    elementId: elementId,
                    details: `要素が右に${overflowAmount}pxはみ出しています`,
                    recommendation: 'max-width: 100%; または box-sizing: border-box; の設定を確認してください',
                    overflowAmount: overflowAmount,
                    elementWidth: Math.round(rect.width),
                    viewportWidth: viewportWidth
                });
            }
            
            // 固定幅チェック
            const width = computedStyle.width;
            const minWidth = computedStyle.minWidth;
            
            if (width && width.includes('px') && !width.includes('calc')) {
                const widthPx = parseInt(width);
                if (widthPx > viewportWidth * 0.95) {
                    const elementId = element.id || `fixed-width-${index}`;
                    if (!element.id) element.id = elementId;
                    
                    issues.push({
                        type: '固定幅過大',
                        severity: widthPx > viewportWidth ? 'HIGH' : 'MEDIUM',
                        element: getElementDescription(element),
                        elementId: elementId,
                        details: `width: ${widthPx}px が設定されています (ビューポート: ${viewportWidth}px)`,
                        recommendation: 'max-width: 100%; またはレスポンシブ単位(%, vw)の使用を検討',
                        fixedWidth: widthPx,
                        viewportWidth: viewportWidth
                    });
                }
            }
            
            if (minWidth && minWidth.includes('px')) {
                const minWidthPx = parseInt(minWidth);
                if (minWidthPx > viewportWidth) {
                    const elementId = element.id || `min-width-${index}`;
                    if (!element.id) element.id = elementId;
                    
                    issues.push({
                        type: '最小幅過大',
                        severity: 'MEDIUM',
                        element: getElementDescription(element),
                        elementId: elementId,
                        details: `min-width: ${minWidthPx}px が設定されています`,
                        recommendation: 'スマホ用にmin-widthを調整するか、メディアクエリで制御',
                        minWidth: minWidthPx,
                        viewportWidth: viewportWidth
                    });
                }
            }
            
            // 画像専用チェック
            if (element.tagName === 'IMG') {
                const naturalWidth = element.naturalWidth;
                
                if (naturalWidth > viewportWidth * 2) {
                    const elementId = element.id || `img-size-${index}`;
                    if (!element.id) element.id = elementId;
                    
                    issues.push({
                        type: '画像サイズ過大',
                        severity: naturalWidth > viewportWidth * 3 ? 'HIGH' : 'MEDIUM',
                        element: getElementDescription(element),
                        elementId: elementId,
                        details: `画像実サイズ: ${naturalWidth}px (推奨: ${viewportWidth * 2}px以下)`,
                        recommendation: '画像を最適化してファイルサイズを削減してください',
                        actualWidth: naturalWidth,
                        viewportWidth: viewportWidth
                    });
                }
                
                if (!element.hasAttribute('alt')) {
                    const elementId = element.id || `img-alt-${index}`;
                    if (!element.id) element.id = elementId;
                    
                    issues.push({
                        type: 'ALTテキスト未設定',
                        severity: 'LOW',
                        element: getElementDescription(element),
                        elementId: elementId,
                        details: 'ALT属性が設定されていません',
                        recommendation: 'アクセシビリティのためalt属性を設定してください'
                    });
                }
            }
        });
        
        // 3. フォントサイズチェック(最適化版)
        const textElements = document.querySelectorAll('p, span, a, li, td, th, h1, h2, h3, h4, h5, h6, div');
        const checkedTextElements = new Set();
        
        textElements.forEach((element, index) => {
            if (checkedTextElements.has(element)) return;
            
            const text = element.textContent.trim();
            if (!text || text.length === 0) return;
            
            // 直接のテキストノードがある場合のみチェック
            const hasDirectText = Array.from(element.childNodes).some(node => 
                node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
            );
            
            if (!hasDirectText) return;
            
            checkedTextElements.add(element);
            
            const computedStyle = getComputedStyle(element);
            const fontSize = parseFloat(computedStyle.fontSize);
            
            if (fontSize < 14) {
                const elementId = element.id || `font-size-${index}`;
                if (!element.id) element.id = elementId;
                
                issues.push({
                    type: '小さすぎるフォント',
                    severity: fontSize < 12 ? 'HIGH' : 'MEDIUM',
                    element: getElementDescription(element),
                    elementId: elementId,
                    details: `フォントサイズ: ${fontSize}px (推奨: 14px以上)`,
                    recommendation: 'フォントサイズを14px以上に設定してください',
                    fontSize: fontSize,
                    textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
                });
            }
        });
        
        // 4. タップ領域チェック
        const tapElements = document.querySelectorAll('a, button, input[type="button"], input[type="submit"], [onclick]');
        
        tapElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const computedStyle = getComputedStyle(element);
            
            if (rect.width === 0 || rect.height === 0 || computedStyle.display === 'none') {
                return;
            }
            
            const minTapSize = 44; // Apple/Google推奨
            
            if (rect.width < minTapSize || rect.height < minTapSize) {
                const elementId = element.id || `tap-target-${index}`;
                if (!element.id) element.id = elementId;
                
                issues.push({
                    type: 'タップ領域小',
                    severity: (rect.width < 32 || rect.height < 32) ? 'HIGH' : 'MEDIUM',
                    element: getElementDescription(element),
                    elementId: elementId,
                    details: `サイズ: ${Math.round(rect.width)}×${Math.round(rect.height)}px (推奨: 44×44px以上)`,
                    recommendation: 'padding等でタップ領域を大きくしてください',
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                });
            }
        });
        
        return issues;
    }

    // 指定された画面幅でクオリティチェック
    function checkQualityForViewport(viewportWidth) {
        const issues = [];
        
        // 1. 画像サイズチェック
        const imageIssues = checkImageSizeForMobile(viewportWidth);
        issues.push(...imageIssues);
        
        // 2. フォントサイズチェック
        const fontIssues = checkSmallFontSize();
        issues.push(...fontIssues);
        
        // 3. 要素見切れチェック
        const overflowIssues = checkElementOverflowForViewport(viewportWidth);
        issues.push(...overflowIssues);
        
        // 4. タップ可能エリアのサイズチェック
        const tapIssues = checkTapTargetSize();
        issues.push(...tapIssues);

        // 5. レスポンシブデザインチェック（新規追加）
        const responsiveIssues = checkResponsiveDesignIssues(viewportWidth);
        issues.push(...responsiveIssues);
        
        return issues;
    }

    // 1. 画像サイズチェック（スマホ用）
    function checkImageSizeForMobile(viewportWidth) {
        const issues = [];
        const mainElement = document.querySelector('main');
        let images;
        
        if (!mainElement) {
            images = Array.from(document.body.querySelectorAll('img'));
        } else {
            images = Array.from(mainElement.querySelectorAll('img'));
        }
        
        images.forEach((img, index) => {
            const rect = img.getBoundingClientRect();
            const naturalWidth = img.naturalWidth;
            const naturalHeight = img.naturalHeight;
            const computedStyle = getComputedStyle(img);
            
            // 非表示画像はスキップ
            if (rect.width === 0 || rect.height === 0) return;
            
            // 画像の実際のファイルサイズが大きすぎる場合
            if (naturalWidth > viewportWidth * 2) {
                const elementId = img.id || `mobile-quality-img-${index}`;
                if (!img.id) img.id = elementId;
                
                issues.push({
                    type: '画像サイズ過大',
                    severity: naturalWidth > viewportWidth * 3 ? 'HIGH' : 'MEDIUM',
                    element: getElementDescription(img),
                    elementId: elementId,
                    details: `画像の実サイズ: ${naturalWidth}×${naturalHeight}px (推奨: ${viewportWidth * 2}px以下)`,
                    recommendation: '画像を最適化してファイルサイズを削減してください',
                    displayWidth: Math.round(rect.width),
                    actualWidth: naturalWidth,
                    viewportWidth: viewportWidth
                });
            }
            
            // CSSで固定幅が設定されていてスマホ画面を超える場合
            const cssWidth = computedStyle.width;
            if (cssWidth && cssWidth.includes('px')) {
                const widthPx = parseInt(cssWidth);
                if (widthPx > viewportWidth) {
                    const elementId = img.id || `mobile-quality-img-css-${index}`;
                    if (!img.id) img.id = elementId;
                    
                    issues.push({
                        type: '画像CSS幅過大',
                        severity: 'HIGH',
                        element: getElementDescription(img),
                        elementId: elementId,
                        details: `CSS width: ${widthPx}px (${viewportWidth}px画面では${widthPx - viewportWidth}pxはみ出し)`,
                        recommendation: 'max-width: 100% を設定してください',
                        displayWidth: widthPx,
                        viewportWidth: viewportWidth
                    });
                }
            }
            
            // 現在の表示サイズがスマホ画面を超える場合
            if (rect.width > viewportWidth && !cssWidth.includes('px')) {
                const elementId = img.id || `mobile-quality-img-display-${index}`;
                if (!img.id) img.id = elementId;
                
                issues.push({
                    type: '画像表示見切れ',
                    severity: 'MEDIUM',
                    element: getElementDescription(img),
                    elementId: elementId,
                    details: `現在の表示幅: ${Math.round(rect.width)}px (${viewportWidth}px画面では見切れる可能性)`,
                    recommendation: 'max-width: 100% を設定してください',
                    displayWidth: Math.round(rect.width),
                    viewportWidth: viewportWidth
                });
            }
        });
        
        return issues;
    }
    // 2. フォントサイズチェック
    function checkSmallFontSize() {
        const issues = [];
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach((element, index) => {
            const computedStyle = getComputedStyle(element);
            const fontSize = parseFloat(computedStyle.fontSize);
            const rect = element.getBoundingClientRect();
            
            // 非表示要素やサイズが0の要素はスキップ
            if (rect.width === 0 || rect.height === 0 || computedStyle.display === 'none') {
                return;
            }
            
            // テキストコンテンツがある要素のみチェック
            const textContent = element.textContent.trim();
            if (!textContent || textContent.length === 0) return;
            
            // 子要素のテキストは除外（重複を避けるため）
            const hasTextChildren = Array.from(element.children).some(child => 
                child.textContent.trim().length > 0
            );
            if (hasTextChildren && element.children.length > 0) return;
            
            if (fontSize <= 13) {
                const elementId = element.id || `mobile-quality-font-${index}`;
                if (!element.id) element.id = elementId;
                
                issues.push({
                    type: '小さすぎるフォント',
                    severity: fontSize <= 11 ? 'HIGH' : fontSize <= 12 ? 'MEDIUM' : 'LOW',
                    element: getElementDescription(element),
                    elementId: elementId,
                    details: `フォントサイズ: ${fontSize}px (推奨: 14px以上)`,
                    recommendation: 'フォントサイズを14px以上に設定してください',
                    fontSize: fontSize,
                    textPreview: textContent.substring(0, 50) + (textContent.length > 50 ? '...' : '')
                });
            }
        });
        
        return issues;
    }

    // 3. 要素見切れチェック（指定画面幅用）
    function checkElementOverflowForViewport(viewportWidth) {
        const issues = [];
        const elementsToCheck = document.querySelectorAll(`
            main *, 
            .content *, 
            article *,
            section *,
            div:not([style*="display: none"]):not([hidden])
        `);
        
        elementsToCheck.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const computedStyle = getComputedStyle(element);
            
            // 非表示要素はスキップ
            if (rect.width === 0 || rect.height === 0 || computedStyle.display === 'none') {
                return;
            }
            
            // CSSで固定幅が設定されている場合
            const fixedWidth = computedStyle.width;
            if (fixedWidth && fixedWidth.includes('px')) {
                const widthPx = parseInt(fixedWidth);
                if (widthPx > viewportWidth) {
                    const elementId = element.id || `mobile-quality-overflow-${index}`;
                    if (!element.id) element.id = elementId;
                    
                    issues.push({
                        type: '要素見切れ（固定幅）',
                        severity: 'HIGH',
                        element: getElementDescription(element),
                        elementId: elementId,
                        details: `CSS固定幅: ${widthPx}px (${viewportWidth}px画面では${widthPx - viewportWidth}pxはみ出し)`,
                        recommendation: 'max-width: 100% または相対単位(%, vw等)の使用を検討',
                        overflowAmount: widthPx - viewportWidth,
                        viewportWidth: viewportWidth
                    });
                }
            }
            
            // min-widthが設定されている場合
            const minWidth = computedStyle.minWidth;
            if (minWidth && minWidth.includes('px')) {
                const minWidthPx = parseInt(minWidth);
                if (minWidthPx > viewportWidth) {
                    const elementId = element.id || `mobile-quality-minwidth-${index}`;
                    if (!element.id) element.id = elementId;
                    
                    issues.push({
                        type: '最小幅過大',
                        severity: 'MEDIUM',
                        element: getElementDescription(element),
                        elementId: elementId,
                        details: `CSS min-width: ${minWidthPx}px (${viewportWidth}px画面では適用困難)`,
                        recommendation: 'min-widthの値を調整するか、メディアクエリで制御',
                        overflowAmount: minWidthPx - viewportWidth,
                        viewportWidth: viewportWidth
                    });
                }
            }
            
            // 現在の表示幅が画面幅を超えている場合（PC画面での実際の見た目）
            if (rect.width > viewportWidth) {
                const elementId = element.id || `mobile-quality-display-${index}`;
                if (!element.id) element.id = elementId;
                
                issues.push({
                    type: '表示幅過大',
                    severity: rect.width > viewportWidth * 1.2 ? 'HIGH' : 'MEDIUM',
                    element: getElementDescription(element),
                    elementId: elementId,
                    details: `現在の表示幅: ${Math.round(rect.width)}px (${viewportWidth}px画面では${Math.round(rect.width - viewportWidth)}pxはみ出し)`,
                    recommendation: 'レスポンシブデザインの調整が必要',
                    overflowAmount: Math.round(rect.width - viewportWidth),
                    viewportWidth: viewportWidth
                });
            }
        });
        
        return issues;
    }

    // 4. タップ可能エリアのサイズチェック
    function checkTapTargetSize() {
        const issues = [];
        const tapElements = document.querySelectorAll('a, button, [onclick], input[type="button"], input[type="submit"]');
        
        tapElements.forEach((element, index) => {
            const rect = element.getBoundingClientRect();
            const computedStyle = getComputedStyle(element);
            
            // 非表示要素はスキップ
            if (rect.width === 0 || rect.height === 0 || computedStyle.display === 'none') {
                return;
            }
            
            const minSize = 44; // Apple/Google推奨の最小タップサイズ
            
            if (rect.width < minSize || rect.height < minSize) {
                const elementId = element.id || `mobile-quality-tap-${index}`;
                if (!element.id) element.id = elementId;
                
                issues.push({
                    type: 'タップエリア小',
                    severity: (rect.width < 32 || rect.height < 32) ? 'HIGH' : 'MEDIUM',
                    element: getElementDescription(element),
                    elementId: elementId,
                    details: `サイズ: ${Math.round(rect.width)}×${Math.round(rect.height)}px (推奨: ${minSize}×${minSize}px以上)`,
                    recommendation: 'padding等でタップエリアを大きくしてください',
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    minSize: minSize
                });
            }
        });
        
        return issues;
    }

    // レスポンシブデザインの問題をチェック
    function checkResponsiveDesignIssues(viewportWidth) {
        const issues = [];
        
        // メディアクエリが適切に設定されているかチェック
        const stylesheets = Array.from(document.styleSheets);
        let hasResponsiveCSS = false;
        
        try {
            stylesheets.forEach(sheet => {
                if (sheet.cssRules) {
                    Array.from(sheet.cssRules).forEach(rule => {
                        if (rule.type === CSSRule.MEDIA_RULE) {
                            if (rule.conditionText.includes('max-width') || rule.conditionText.includes('min-width')) {
                                hasResponsiveCSS = true;
                            }
                        }
                    });
                }
            });
        } catch (e) {
            // CORS制限等でアクセスできない場合
        }
        
        if (!hasResponsiveCSS) {
            issues.push({
                type: 'レスポンシブCSS未検出',
                severity: 'MEDIUM',
                element: 'CSS全体',
                elementId: 'responsive-css-check',
                details: 'メディアクエリが検出されませんでした',
                recommendation: '@media (max-width: XXXpx) などのレスポンシブCSSの追加を検討',
                viewportWidth: viewportWidth
            });
        }
        
        return issues;
    }

    // サマリー生成
    function generateQualitySummary(allIssues) {
        const summary = {
            totalIssues: 0,
            highSeverity: 0,
            mediumSeverity: 0,
            lowSeverity: 0,
            byType: {}
        };
        
        Object.values(allIssues).forEach(deviceResult => {
            deviceResult.issues.forEach(issue => {
                summary.totalIssues++;
                
                switch(issue.severity) {
                    case 'HIGH':
                        summary.highSeverity++;
                        break;
                    case 'MEDIUM':
                        summary.mediumSeverity++;
                        break;
                    case 'LOW':
                        summary.lowSeverity++;
                        break;
                }
                
                if (!summary.byType[issue.type]) {
                    summary.byType[issue.type] = 0;
                }
                summary.byType[issue.type]++;
            });
        });
        
        return summary;
    }

    // 結果表示
    function displayResults(results, type) {
        let html = `
            <h4 style="margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 8px; font-size: 16px;">
                📊 検証結果
            </h4>
        `;

        // スマホクオリティチェック結果（新版）
        if (results.mobileQuality) {
            const summary = results.mobileQuality.summary;
            const instructions = results.mobileQuality.instructions;
            const recommendedViewports = results.mobileQuality.recommendedViewports;
            
            html += `
                <h5 style="color: #e91e63; margin: 20px 0 10px 0; font-size: 14px;">📱 スマホクオリティチェック</h5>
                
                <!-- 使用注意 -->
                <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 12px; margin: 10px 0; border-radius: 4px; font-size: 12px;">
                    <strong>💡 使用方法:</strong><br>
                    ${instructions}<br><br>
                    <strong>推奨テストサイズ:</strong><br>
                    ${Object.entries(recommendedViewports).map(([name, width]) => 
                        `${name}: ${width}px`
                    ).join(' | ')}
                </div>
                
                <!-- サマリー -->
                <div style="background: #f8f9fa; border: 1px solid #ddd; padding: 12px; margin: 10px 0; border-radius: 5px; font-size: 12px;">
                    <strong>📊 全体サマリー:</strong><br>
                    総問題数: ${summary.totalIssues}件 
                    (🚨重要: ${summary.highSeverity}件, ⚠️中程度: ${summary.mediumSeverity}件, 💡軽微: ${summary.lowSeverity}件)<br>
                    ${summary.totalIssues > 0 ? 
                        `<strong>主な問題種別:</strong> ${Object.entries(summary.byType).map(([type, count]) => `${type}(${count}件)`).join(', ')}`
                        : '✅ 問題は検出されませんでした！'}
                </div>
                
                <!-- 詳細結果 -->
                ${Object.entries(results.mobileQuality.results).map(([deviceName, deviceResult]) => {
                    if (deviceResult.issues.length === 0) {
                        return `
                            <div style="background: #e8f5e9; border: 1px solid #4caf50; padding: 15px; margin: 10px 0; border-radius: 5px; text-align: center;">
                                ✅ ${deviceName}では問題は検出されませんでした
                            </div>
                        `;
                    }
                    
                    const highIssues = deviceResult.issues.filter(issue => issue.severity === 'HIGH');
                    
                    return `
                        <div style="margin: 15px 0; border: 2px solid #e91e63; border-radius: 5px; overflow: hidden;">
                            <div style="background: #fce4ec; padding: 12px; border-bottom: 1px solid #e91e63;">
                                <strong style="font-size: 14px;">${deviceName}</strong>
                                <span style="color: #666; font-size: 12px;"> - 問題数: ${deviceResult.issues.length}件</span>
                                ${highIssues.length > 0 ? `
                                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f8bbd0;">
                                    <strong style="color: #d32f2f;">🚨 優先対応が必要な問題:</strong><br>
                                    <div style="margin-top: 5px;">
                                        ${highIssues.map((issue, index) => 
                                            `<a href="#quality-issue-${index}" style="display: inline-block; background: #ffebee; color: #d32f2f; margin: 3px; padding: 4px 8px; text-decoration: none; border-radius: 3px; font-size: 12px;">
                                                ${issue.type} →
                                            </a>`
                                        ).join('')}
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                            
                            <table style="${tableStyle}; margin: 0;">
                                <tr>
                                    <th style="${headerStyle}; width: 80px;">重要度</th>
                                    <th style="${headerStyle}; width: 120px;">種別</th>
                                    <th style="${headerStyle};">詳細</th>
                                    <th style="${headerStyle}; width: 80px;">要素</th>
                                </tr>
                                ${deviceResult.issues.map((issue, index) => {
                                    let severityColor = issue.severity === 'HIGH' ? '#d32f2f' : 
                                                    issue.severity === 'MEDIUM' ? '#f57c00' : '#689f38';
                                    let severityText = issue.severity === 'HIGH' ? '🚨 重要' : 
                                                    issue.severity === 'MEDIUM' ? '⚠️ 中' : '💡 低';
                                    
                                    return `<tr id="quality-issue-${index}" style="background: ${issue.severity === 'HIGH' ? '#ffebee' : 'white'};">
                                        <td style="${cellStyle}; color: ${severityColor}; font-weight: bold; text-align: center;">
                                            ${severityText}
                                        </td>
                                        <td style="${cellStyle}; font-weight: bold; font-size: 12px;">
                                            ${issue.type}
                                        </td>
                                        <td style="${cellStyle};">
                                            <div style="margin-bottom: 6px;"><strong>🔍 詳細:</strong> ${issue.details}</div>
                                            <div style="color: #0277bd; background: #e1f5fe; padding: 6px; border-radius: 3px; font-size: 12px;">
                                                <strong>💡 推奨対応:</strong> ${issue.recommendation}
                                            </div>
                                            ${issue.textPreview ? `<div style="margin-top: 6px; font-size: 11px; color: #666;"><strong>テキスト:</strong> "${issue.textPreview}"</div>` : ''}
                                        </td>
                                        <td style="${cellStyle}; text-align: center;">
                                            <a href="#" onclick="highlightElement('${issue.elementId}'); return false;" 
                                            style="display: inline-block; background: #4285f4; color: white; padding: 6px 10px; text-decoration: none; border-radius: 4px; font-size: 11px;">
                                                📍 表示
                                            </a>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </table>
                        </div>
                    `;
                }).join('')}
            `;
        }

        if (results.linksList) {
            html += `
                <h5 style="color: #4285f4; margin: 20px 0 10px 0; font-size: 14px;">🔗 リンク一覧</h5>
                <p style="font-size: 12px;"><strong>総リンク数:</strong> ${results.linksList.length}件</p>
                
                <table style="${tableStyle}; font-size: 13px;">
                    <tr>
                        <th style="${headerStyle}; ">No.</th>
                        <th style="${headerStyle}; ">リンクテキスト</th>
                        <th style="${headerStyle}; ">URL</th>
                        <th style="${headerStyle}; ">target</th>
                    </tr>
                    ${results.linksList.map(link => 
                        `<tr>
                            <td style="${cellStyle}; ">${link.index}</td>
                            <td style="${cellStyle}; ">
                                <a href="#" onclick="highlightElement('${link.elementId}'); return false;" 
                                style="color: #4285f4; text-decoration: underline; cursor: pointer;">
                                    ${link.text}
                                </a>
                            </td>
                            <td style="${cellStyle}; word-break: break-all; font-size: 12px;">${link.href}</td>
                            <td style="${cellStyle}; ">${link.target}</td>
                        </tr>`
                    ).join('')}
                </table>
            `;
        }

        // リンク切れチェック結果
        if (results.linksBroken) {
            const okLinks = results.linksBroken.filter(link => link.status === 'OK');
            const errorLinks = results.linksBroken.filter(link => link.status === 'ERROR');
            const skipLinks = results.linksBroken.filter(link => link.status === 'SKIP');
            
            html += `
                <h5 style="color: #ff4444; margin: 20px 0 10px 0; font-size: 14px;">⚠️ リンク切れチェック結果</h5>
                <p style="font-size: 12px;"><strong>総リンク数:</strong> ${results.linksBroken.length}件 
                (正常: ${okLinks.length}件, エラー: ${errorLinks.length}件, スキップ: ${skipLinks.length}件)</p>
                
                ${errorLinks.length > 0 ? `
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 8px; margin: 8px 0; border-radius: 5px; font-size: 13px;">
                    <strong>⚠️ エラーリンクに移動:</strong><br>
                    ${errorLinks.map(link => 
                        `<a href="#link-row-${link.index}" style="color: #d63031; margin-right: 8px; text-decoration: underline; font-size: 12px;">
                            #${link.index}
                        </a>`
                    ).join('')}
                </div>
                ` : ''}
                
                <table style="${tableStyle}; ">
                    <tr>
                        <th style="${headerStyle}; ">No.</th>
                        <th style="${headerStyle}; ">リンクテキスト</th>
                        <th style="${headerStyle}; ">URL</th>
                        <th style="${headerStyle}; ">状態</th>
                    </tr>
                    ${results.linksBroken.map(link => 
                        `<tr id="link-row-${link.index}">
                            <td style="${cellStyle}; ">${link.index}</td>
                            <td style="${cellStyle}; ">
                                <a href="#" onclick="highlightElement('${link.elementId}'); return false;" 
                                style="color: #4285f4; text-decoration: underline; cursor: pointer;">
                                    ${link.text}
                                </a>
                            </td>
                            <td style="${cellStyle}; word-break: break-all; font-size: 12px;">${link.href}</td>
                            <td style="${cellStyle}; color: ${link.status === 'OK' ? 'green' : link.status === 'ERROR' ? 'red' : 'orange'}; font-size: 12px;">
                                ${link.status}
                            </td>
                        </tr>`
                    ).join('')}
                </table>
            `;
        }

        // 画像結果
        if (results.images) {
            html += `
                <h5 style="color: #34a853; margin: 20px 0 10px 0; font-size: 14px;">🖼️ 画像一覧</h5>
                <p style="font-size: 12px;"><strong>総画像数:</strong> ${results.images.length}件</p>
                
                <table style="${tableStyle}; ">
                    <tr>
                        <th style="${headerStyle}; ">No.</th>
                        <th style="${headerStyle}; ">プレビュー</th>
                        <th style="${headerStyle}; ">ALT</th>
                        <th style="${headerStyle}; ">サイズ</th>
                    </tr>
                    ${results.images.map(img => 
                        `<tr>
                            <td style="${cellStyle}; ">${img.index}</td>
                            <td style="${cellStyle}">
                                <img src="${img.src}" style="max-width:30px; max-height:30px;" 
                                    onerror="this.style.display='none'; this.nextSibling.style.display='inline';">
                                <span style="display:none; color:red; font-size: 13px;">❌</span>
                            </td>
                            <td style="${cellStyle}; color: ${img.alt === '[ALTなし]' ? 'red' : 'black'}; font-size: 13px;">${img.alt}</td>
                            <td style="${cellStyle}; ">${img.width}×${img.height}</td>
                        </tr>`
                    ).join('')}
                </table>
            `;
        }
        
        // metaタグ結果
        if (results.meta) {
            html += `
                <h5 style="color: #9c27b0; margin: 20px 0 10px 0; font-size: 14px;">🏷️ metaタグ一覧</h5>
                
                <table style="${tableStyle}; ">
                    <tr>
                        <th style="${headerStyle}; ">metaタグ名</th>
                        <th style="${headerStyle}; ">内容</th>
                        <th style="${headerStyle}; ">状態</th>
                    </tr>
                    ${results.meta.map(meta => {
                        let statusColor = 'green';
                        let statusText = meta.status;
                        
                        if (meta.status === 'WARNING') {
                            statusColor = 'orange';
                            statusText = '⚠️ 要確認';
                        } else if (meta.status === 'MISSING') {
                            statusColor = 'red';
                            statusText = '❌ 未設定';
                        } else if (meta.status === 'OK') {
                            statusText = '✅ OK';
                        }
                        
                        return `<tr>
                            <td style="${cellStyle}; "><strong>${meta.name}</strong></td>
                            <td style="${cellStyle}; word-break: break-all; ">
                                ${meta.content}
                                ${meta.warning ? `<br><small style="color: #d63031; background: #fff3cd; padding: 2px 4px; border-radius: 3px; font-size: 12px;">⚠️ ${meta.warning}</small>` : ''}
                            </td>
                            <td style="${cellStyle}; color: ${statusColor}; ">
                                ${statusText}
                            </td>
                        </tr>`;
                    }).join('')}
                </table>
            `;
        }

        // 最後に浮いているエリアを作成
        createFloatingToolArea(html);
    }

    // 要素ハイライト機能をグローバルに追加
    window.highlightElement = function(elementId) {
        
        // 既存のハイライトを削除
        const existingHighlight = document.querySelector('.web-checker-highlight');
        if (existingHighlight) {
            existingHighlight.classList.remove('web-checker-highlight');
        }
        
        // 対象要素を取得
        const targetElement = document.getElementById(elementId);
        if (targetElement) {
            // スタイルを追加
            const style = document.createElement('style');
            style.textContent = `
                .web-checker-highlight {
                    border: 3px solid #ff0000 !important;
                    box-shadow: 0 0 10px rgba(255, 0, 0, 0.5) !important;
                    background-color: rgba(255, 255, 0, 0.2) !important;
                }
            `;
            if (!document.querySelector('#web-checker-highlight-style')) {
                style.id = 'web-checker-highlight-style';
                document.head.appendChild(style);
            }
            
            // ハイライトを適用
            targetElement.classList.add('web-checker-highlight');
            
            // パネル幅を考慮してスクロール
            const rect = targetElement.getBoundingClientRect();
            const panelWidth = 400;
            const targetX = rect.left + rect.width / 2;
            
            // パネルに隠れる場合は左にスクロール
            if (targetX > window.innerWidth - panelWidth) {
                window.scrollBy({
                    left: -(panelWidth + 50),
                    behavior: 'smooth'
                });
            }
            
            // 要素にスクロール
            targetElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // 10秒後にハイライトを削除
            setTimeout(() => {
                targetElement.classList.remove('web-checker-highlight');
            }, 10000);
        }
    };

    // メニューを表示して開始
    showMenu();
    })();