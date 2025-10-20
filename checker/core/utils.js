(function() {
    'use strict';
    
    // 共通ユーティリティ
    WebChecker.core.utils = {
        
        // SheetJS読み込み
        loadSheetJS: function() {
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
        },
        
        // 通知表示
        showNotification: function(message, type = 'info') {
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
        },
        
        // URL正規化
        normalizeUrl: function(url) {
            try {
                const urlObj = new URL(url);
                urlObj.protocol = 'https:';
                let pathname = urlObj.pathname;
                if (pathname.endsWith('/') && pathname !== '/') {
                    pathname = pathname.slice(0, -1);
                }
                urlObj.pathname = pathname;
                urlObj.search = '';
                urlObj.hash = '';
                return urlObj.toString();
            } catch (error) {
                return url;
            }
        },
        
        // 要素の説明を生成
        getElementDescription: function(element) {
            let description = element.tagName.toLowerCase();
            
            if (element.className) {
                description += `.${element.className.split(' ')[0]}`;
            }
            
            if (element.id) {
                description += `#${element.id}`;
            }
            
            const text = element.textContent.trim();
            if (text && text.length > 0) {
                description += ` "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`;
            }
            
            return description;
        },
        
        // 要素ハイライト
        highlightElement: function(elementId) {
            const existingHighlight = document.querySelector('.web-checker-highlight');
            if (existingHighlight) {
                existingHighlight.classList.remove('web-checker-highlight');
            }
            
            const targetElement = document.getElementById(elementId);
            if (targetElement) {
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
                
                targetElement.classList.add('web-checker-highlight');
                
                const rect = targetElement.getBoundingClientRect();
                const panelWidth = 400;
                const targetX = rect.left + rect.width / 2;
                
                if (targetX > window.innerWidth - panelWidth) {
                    window.scrollBy({
                        left: -(panelWidth + 50),
                        behavior: 'smooth'
                    });
                }
                
                targetElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                setTimeout(() => {
                    targetElement.classList.remove('web-checker-highlight');
                }, 10000);
            }
        },
        
        // テーブルスタイル
        tableStyle: `
            width: 100%; 
            border-collapse: collapse; 
            margin: 10px 0; 
            border: 2px solid #000;
        `,
        
        cellStyle: `
            border: 1px solid #000; 
            padding: 10px; 
            text-align: left;
            font-size: 13px;
        `,
        
        headerStyle: `
            border: 1px solid #000; 
            padding: 10px; 
            background: #f0f0f0; 
            font-weight: bold;
            font-size: 14px;
        `
    };
    
    // グローバルに関数を登録
    window.highlightElement = WebChecker.core.utils.highlightElement;
    
})();