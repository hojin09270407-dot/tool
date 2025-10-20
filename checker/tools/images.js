(function() {
    'use strict';
    
    const utils = WebChecker.core.utils;
    const ui = WebChecker.core.ui;
    
    WebChecker.tools.images = {
        
        // 画像チェック実行
        checkImages: async function() {
            ui.createFloatingToolArea(`
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
                    <h3 style="margin: 0; color: #333;">検証中...</h3>
                    <p style="margin: 10px 0 0 0; color: #666;">しばらくお待ちください。</p>
                </div>
            `);
            
            try {
                const results = await this.getImages();
                this.displayResults(results);
            } catch (error) {
                ui.createFloatingToolArea(`
                    <div style="text-align: center; padding: 40px 20px;">
                        <div style="font-size: 48px; margin-bottom: 20px;">❌</div>
                        <h3 style="color: #ff4444; margin: 0;">エラーが発生しました</h3>
                        <p style="margin: 10px 0; color: #666;">${error.message}</p>
                    </div>
                `);
            }
        },
        
        // 画像一覧化
        getImages: async function() {
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
                    element: img
                });
            }
            
            return results;
        },
        
        // 結果表示
        displayResults: function(results) {
            let html = `
                <h4 style="margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 8px; font-size: 16px;">
                    📊 画像一覧
                </h4>
                <p style="font-size: 12px;"><strong>総画像数:</strong> ${results.length}件</p>
                
                <table style="${utils.tableStyle}">
                    <tr>
                        <th style="${utils.headerStyle}">No.</th>
                        <th style="${utils.headerStyle}">プレビュー</th>
                        <th style="${utils.headerStyle}">ALT</th>
                        <th style="${utils.headerStyle}">サイズ</th>
                    </tr>
                    ${results.map(img => 
                        `<tr>
                            <td style="${utils.cellStyle}">${img.index}</td>
                            <td style="${utils.cellStyle}">
                                <img src="${img.src}" style="max-width:30px; max-height:30px;" 
                                    onerror="this.style.display='none'; this.nextSibling.style.display='inline';">
                                <span style="display:none; color:red; font-size: 13px;">❌</span>
                            </td>
                            <td style="${utils.cellStyle} color: ${img.alt === '[ALTなし]' ? 'red' : 'black'}; font-size: 13px;">${img.alt}</td>
                            <td style="${utils.cellStyle}">${img.width}×${img.height}</td>
                        </tr>`
                    ).join('')}
                </table>
            `;
            
            ui.createFloatingToolArea(html);
        }
    };
    
})();