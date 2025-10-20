(function() {
    'use strict';
    
    const utils = WebChecker.core.utils;
    
    WebChecker.tools.feedback = {
        canvas: null,
        palette: null,
        
        // フィードバックツールを表示
        show: function() {
            const existingCanvas = document.getElementById('feedback-canvas');
            if (existingCanvas) {
                existingCanvas.remove();
            }
            
            const existingPalette = document.getElementById('feedback-palette');
            if (existingPalette) {
                existingPalette.remove();
            }
            
            this.createCanvas();
            this.createPalette();
        },
        
        // キャンバス作成
        createCanvas: function() {
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
            
            // スクロール時の座標調整
            function getAdjustedCoordinates(e) {
                return {
                    x: e.clientX + window.scrollX,
                    y: e.clientY + window.scrollY
                };
            }
            
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
                    penPath: penPath,
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
                        drawPenPath(ctx, shape.penPath, shape.color, shape.lineWidth);
                    } else if (shape.type === 'rectangle') {
                        drawRectangle(ctx, shape.x1, shape.y1, shape.x2, shape.y2, shape.color, shape.lineWidth, shape.fill);
                    } else if (shape.type === 'circle') {
                        drawCircle(ctx, shape.x1, shape.y1, shape.x2, shape.y2, shape.color, shape.lineWidth, shape.fill);
                    }
                    
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
            
            // 四角形を描画
            function drawRectangle(ctx, x1, y1, x2, y2, color, lineWidth, fill = false) {
                if (fill) {
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = color;
                    ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
                    ctx.globalAlpha = 1.0;
                    
                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineWidth;
                    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                } else {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineWidth;
                    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                }
            }
            
            // 円を描画
            function drawCircle(ctx, x1, y1, x2, y2, color, lineWidth, fill = false) {
                const centerX = x1;
                const centerY = y1;
                const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                
                if (fill) {
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                    
                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineWidth;
                    ctx.stroke();
                } else {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = lineWidth;
                    ctx.stroke();
                }
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
                
                isDrawing = true;
                startX = coords.x;
                startY = coords.y;
                
                if (currentTool === 'pen') {
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    window.currentPenPath = [{ x: startX, y: startY }];
                } else if (currentTool === 'rectangle' || currentTool === 'circle') {
                    createPreviewCanvas();
                }
            });
            
            // マウス移動イベント
            canvas.addEventListener('mousemove', (e) => {
                const coords = getAdjustedCoordinates(e);
                
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
                    ctx.lineTo(coords.x, coords.y);
                    ctx.strokeStyle = currentColor;
                    ctx.lineWidth = currentSize;
                    ctx.lineCap = 'round';
                    ctx.stroke();
                    
                    if (!window.currentPenPath) {
                        window.currentPenPath = [];
                    }
                    window.currentPenPath.push({ x: coords.x, y: coords.y });
                    
                } else if (currentTool === 'rectangle' && previewCanvas) {
                    const previewCtx = previewCanvas.getContext('2d');
                    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                    previewCtx.globalAlpha = 0.7;
                    drawRectangle(previewCtx, startX, startY, coords.x, coords.y, currentColor, currentSize, currentFillMode);
                    previewCtx.globalAlpha = 1.0;
                } else if (currentTool === 'circle' && previewCanvas) {
                    const previewCtx = previewCanvas.getContext('2d');
                    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
                    previewCtx.globalAlpha = 0.7;
                    drawCircle(previewCtx, startX, startY, coords.x, coords.y, currentColor, currentSize, currentFillMode);
                    previewCtx.globalAlpha = 1.0;
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
            
            // キーボードイベント(図形削除)
            document.addEventListener('keydown', (e) => {
                if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeIndex !== -1) {
                    window.feedbackShapes.splice(selectedShapeIndex, 1);
                    selectedShapeIndex = -1;
                    redrawCanvas();
                }
            });
            
            // コメントバブルを作成
            function createCommentBubble(clientX, clientY) {
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
                
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    bubble.remove();
                });
                
                bubble.appendChild(input);
                bubble.appendChild(closeBtn);
                document.body.appendChild(bubble);
                
                // ドラッグ機能
                let isDragging = false;
                let dragStart = { x: 0, y: 0 };
                
                bubble.addEventListener('mousedown', (e) => {
                    if (e.target === input || e.target === closeBtn) return;
                    isDragging = true;
                    dragStart.x = e.clientX - bubble.offsetLeft;
                    dragStart.y = e.clientY - bubble.offsetTop;
                });
                
                document.addEventListener('mousemove', (e) => {
                    if (!isDragging) return;
                    bubble.style.left = (e.clientX - dragStart.x) + 'px';
                    bubble.style.top = (e.clientY - dragStart.y) + 'px';
                });
                
                document.addEventListener('mouseup', () => {
                    isDragging = false;
                });
                
                input.focus();
            }
            
            // グローバル関数
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
            
            updateToolButtons('pen');
            updateColorButtons('#b22222');
            updateSizeButtons(3);
            updateFillButtons(false);
            
            this.canvas = canvas;
        },
        
        // パレット作成
        createPalette: function() {
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
                
                <div style="margin-bottom: 15px;">
                    <label style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 8px;">ツール:</label>
                    <button onclick="setFeedbackTool('pen')" data-tool="pen" style="padding: 6px 12px; margin: 3px; border: 1px solid #ddd; background: #4285f4; color: white; cursor: pointer; border-radius: 4px; font-size: 13px;">🖊️ ペン</button>
                    <button onclick="setFeedbackTool('rectangle')" data-tool="rectangle" style="padding: 6px 12px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">⬜ 四角</button>
                    <button onclick="setFeedbackTool('circle')" data-tool="circle" style="padding: 6px 12px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">⭕ 円</button>
                    <button onclick="setFeedbackTool('comment')" data-tool="comment" style="padding: 6px 12px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">💬 コメント</button>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 8px;">スタイル:</label>
                    <button onclick="setFeedbackFillMode(false)" data-fill="false" style="padding: 6px 10px; margin: 3px; border: 1px solid #ddd; background: #4285f4; color: white; cursor: pointer; border-radius: 4px; font-size: 13px;">線のみ</button>
                    <button onclick="setFeedbackFillMode(true)" data-fill="true" style="padding: 6px 10px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">塗りつぶし</button>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 8px;">色:</label>
                    <button onclick="setFeedbackColor('#b22222')" data-color="#b22222" style="width: 28px; height: 28px; background: #b22222; border: 3px solid #333; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                    <button onclick="setFeedbackColor('#228b22')" data-color="#228b22" style="width: 28px; height: 28px; background: #228b22; border: 1px solid #ccc; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                    <button onclick="setFeedbackColor('#4169e1')" data-color="#4169e1" style="width: 28px; height: 28px; background: #4169e1; border: 1px solid #ccc; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                    <button onclick="setFeedbackColor('#ccc300')" data-color="#ccc300" style="width: 28px; height: 28px; background: #ccc300; border: 1px solid #ccc; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                    <button onclick="setFeedbackColor('#8b008b')" data-color="#8b008b" style="width: 28px; height: 28px; background: #8b008b; border: 1px solid #ccc; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                    <button onclick="setFeedbackColor('#000000')" data-color="#000000" style="width: 28px; height: 28px; background: #000000; border: 1px solid #ccc; margin: 3px; cursor: pointer; border-radius: 4px;"></button>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <label style="font-size: 14px; font-weight: bold; display: block; margin-bottom: 8px;">太さ:</label>
                    <button onclick="setFeedbackSize(2)" data-size="2" style="padding: 6px 10px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">細</button>
                    <button onclick="setFeedbackSize(5)" data-size="5" style="padding: 6px 10px; margin: 3px; border: 1px solid #ddd; background: #4285f4; color: white; cursor: pointer; border-radius: 4px; font-size: 13px;">普通</button>
                    <button onclick="setFeedbackSize(8)" data-size="8" style="padding: 6px 10px; margin: 3px; border: 1px solid #ddd; background: #f0f0f0; cursor: pointer; border-radius: 4px; font-size: 13px;">太</button>
                </div>
                
                <div style="margin-bottom: 15px; padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 13px; color: #666;">
                    <strong>操作方法:</strong><br>
                    • 図形クリック: 選択・移動<br>
                    • Delete/Backspace: 選択図形削除
                </div>
                
                <div>
                    <button onclick="clearFeedback()" style="width: 100%; padding: 10px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-bottom: 6px;">🗑️ クリア</button>
                    <button onclick="closeFeedbackTool()" style="width: 100%; padding: 10px; background: #9e9e9e; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">✖️ 閉じる</button>
                </div>
            `;
            
            document.body.appendChild(palette);
            this.palette = palette;
        }
    };
    
    // フィードバックツールを閉じる
    window.closeFeedbackTool = function() {
        const canvas = document.getElementById('feedback-canvas');
        const palette = document.getElementById('feedback-palette');
        const bubbles = document.querySelectorAll('.feedback-comment-bubble');
        
        if (canvas) canvas.remove();
        if (palette) palette.remove();
        bubbles.forEach(bubble => bubble.remove());
    };
    
})();