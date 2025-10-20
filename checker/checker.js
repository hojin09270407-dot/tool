(function() {
    'use strict';
    
    // 設定
    const CONFIG = {
        baseUrl: 'https://hojin09270407-dot.github.io/tool/checker/', // サーバー上のベースURL
        modules: [
            'core/utils.js',
            'core/ui.js',
            'tools/feedback.js',
            'tools/ruler.js',
            'tools/layout.js',
            'tools/links.js',
            'tools/images.js',
            'tools/meta.js',
            'tools/mobile.js',
            'tools/image-batch.js',
            'tools/meta-batch.js'
        ]
    };
    
    // グローバル名前空間
    window.WebChecker = window.WebChecker || {
        tools: {},
        core: {}
    };
    
    // モジュール読み込み
    function loadModule(url) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = url;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`モジュール読み込み失敗: ${url}`));
            document.head.appendChild(script);
        });
    }
    
    // 初期化
    async function init() {
        try {
            // 既存のオーバーレイがあれば削除
            const existingOverlay = document.getElementById('web-checker-overlay');
            if (existingOverlay) {
                existingOverlay.remove();
            }
            
            // ローディング表示
            showLoading();
            
            // 全モジュールを読み込み
            for (const module of CONFIG.modules) {
                await loadModule(CONFIG.baseUrl + module);
            }
            
            // メニュー表示
            hideLoading();
            WebChecker.core.ui.showMenu();
            
        } catch (error) {
            hideLoading();
            alert(`ツールの読み込みに失敗しました: ${error.message}`);
            console.error(error);
        }
    }
    
    function showLoading() {
        const loading = document.createElement('div');
        loading.id = 'web-checker-loading';
        loading.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px 40px;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 9999999;
            font-family: Arial, sans-serif;
            text-align: center;
        `;
        loading.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 10px;">🔄</div>
            <div>ツールを読み込み中...</div>
        `;
        document.body.appendChild(loading);
    }
    
    function hideLoading() {
        const loading = document.getElementById('web-checker-loading');
        if (loading) loading.remove();
    }
    
    // 初期化実行
    init();
})();
