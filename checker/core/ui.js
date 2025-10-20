(function() {
    'use strict';
    
    const utils = WebChecker.core.utils;
    
    WebChecker.core.ui = {
        
        // メインUIを作成
        createMainUI: function() {
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
            
            const title = document.createElement('div');
            title.textContent = '🔍 Dツール';
            title.style.cssText = `
                color: white;
                font-size: 16px;
                font-weight: 700;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                flex-shrink: 0;
            `;
            
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
            
            const hideScrollbarStyle = document.createElement('style');
            hideScrollbarStyle.textContent = `
                #web-checker-menu-area::-webkit-scrollbar {
                    display: none;
                }
            `;
            document.head.appendChild(hideScrollbarStyle);
            
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
        },
        
        // 浮いているエリアを作成
        createFloatingToolArea: function(content) {
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
            
            // リサイズハンドル
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
            
            // ヘッダー
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
            
            const contentArea = document.createElement('div');
            contentArea.style.cssText = `
                padding: 20px;
                overflow-y: auto;
                flex: 1;
                font-size: 14px;
                line-height: 1.5;
            `;
            contentArea.innerHTML = content;
            
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
        },
        
        // メニューを表示
        showMenu: function() {
            const menuArea = this.createMainUI();
            
            const buttons = [
                { id: 'check-links-list', text: '🔗 リンク', color: '#4285f4', action: () => WebChecker.tools.links.checkLinksList() },
                { id: 'check-links-broken', text: '⚠️ リンク切れ', color: '#ff4444', action: () => WebChecker.tools.links.checkLinksBroken() },
                { id: 'check-images', text: '🖼️ 画像', color: '#34a853', action: () => WebChecker.tools.images.checkImages() },
                { id: 'batch-image-check', text: '📊 画像一括', color: '#ff6b35', action: () => WebChecker.batch.imageBatch.show() },
                { id: 'check-meta', text: '🏷️ meta', color: '#9c27b0', action: () => WebChecker.tools.meta.checkMeta() },
                { id: 'batch-meta-check', text: '📊 meta一括', color: '#9c27b0', action: () => WebChecker.batch.metaBatch.show() },
                { id: 'check-mobile-quality', text: '📱 スマホ', color: '#e91e63', action: () => WebChecker.tools.mobile.checkQuality() },
                { id: 'feedback-tool', text: '✏️ フィードバック', color: '#ff9800', action: () => WebChecker.tools.feedback.show() },
                { id: 'object-ruler', text: '📏 定規', color: '#28a745', action: () => WebChecker.tools.ruler.activate() },
                { id: 'layout-display', text: '🗺️ レイアウト可視化', color: '#6f42c1', action: () => WebChecker.tools.layout.activate() }
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
    };
    
})();