(function() {
    'use strict';
    
    const utils = WebChecker.core.utils;
    const ui = WebChecker.core.ui;
    
    WebChecker.batch.imageBatch = {
        
        // 画像一括チェック画面を表示
        show: function() {
            const batchHTML = `
                <h4 style="margin: 0 0 20px 0; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; font-size: 18px; font-weight: 600;">
                    📊 画像一括チェック
                </h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 8px;">調査対象URL(1行1URL):</label>
                    <textarea id="batch-urls" placeholder="調査したいURLを1行ずつ入力してください&#10;例:&#10;https://example.com&#10;https://example.com/page1&#10;https://example.com/page2" 
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
            
            ui.createFloatingToolArea(batchHTML);
            
            setTimeout(() => {
                const startButton = document.getElementById('start-batch-check');
                if (startButton) {
                    startButton.addEventListener('click', () => this.startBatchCheck());
                }
                
                const exportButton = document.getElementById('export-excel');
                if (exportButton) {
                    exportButton.addEventListener('click', () => this.exportToExcel());
                }
            }, 100);
        },
        
        // 一括チェック開始
        startBatchCheck: async function() {
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
            
            document.getElementById('batch-progress').style.display = 'block';
            document.getElementById('start-batch-check').disabled = true;
            document.getElementById('start-batch-check').textContent = '処理中...';
            
            const progressBar = document.getElementById('progress-bar');
            const progressText = document.getElementById('progress-text');
            const progressDetails = document.getElementById('progress-details');
            
            const allResults = [];
            
            try {
                await utils.loadSheetJS();
                
                for (let i = 0; i < urls.length; i++) {
                    const url = urls[i];
                    const progress = Math.round(((i + 1) / urls.length) * 100);
                    
                    progressBar.style.width = `${progress}%`;
                    progressText.textContent = `${i + 1}/${urls.length} 処理中: ${url}`;
                    
                    try {
                        const result = await this.checkSingleURL(url);
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
                    
                    progressDetails.scrollTop = progressDetails.scrollHeight;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                progressText.textContent = `完了! ${urls.length}件のURL処理が終了しました`;
                document.getElementById('export-excel').disabled = false;
                document.getElementById('batch-results').style.display = 'block';
                
                this.displaySummary(allResults);
                window.batchCheckResults = allResults;
                
            } catch (error) {
                progressText.textContent = `エラーが発生しました: ${error.message}`;
                progressDetails.innerHTML += `<div style="color: red;">❌ 処理中断: ${error.message}</div>`;
            } finally {
                document.getElementById('start-batch-check').disabled = false;
                document.getElementById('start-batch-check').textContent = '🚀 一括チェック開始';
            }
        },
        
        // 単一URL画像チェック
        checkSingleURL: function(url) {
            return new Promise((resolve, reject) => {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = url;
                
                const timeout = setTimeout(() => {
                    document.body.removeChild(iframe);
                    reject(new Error('タイムアウト'));
                }, 10000);
                
                iframe.onload = function() {
                    try {
                        clearTimeout(timeout);
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                        
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
        },
        
        // サマリー表示
        displaySummary: function(results) {
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
        },
        
        // Excel出力
        exportToExcel: function() {
            if (!window.batchCheckResults) {
                alert('エクスポートするデータがありません');
                return;
            }
            
            try {
                const workbook = XLSX.utils.book_new();
                
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
                
                const summaryData = window.batchCheckResults.map(result => ({
                    'URL': result.url,
                    '処理結果': result.error ? 'エラー' : '成功',
                    '画像数': result.images ? result.images.length : 0,
                    'エラー内容': result.error || '-',
                    '調査日時': result.timestamp || new Date().toLocaleString()
                }));
                
                const summarySheet = XLSX.utils.json_to_sheet(summaryData);
                XLSX.utils.book_append_sheet(workbook, summarySheet, "調査サマリー");
                
                const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-T]/g, '');
                const filename = `画像一括調査結果_${timestamp}.xlsx`;
                
                XLSX.writeFile(workbook, filename);
                
                alert(`Excel ファイル "${filename}" をダウンロードしました!`);
                
            } catch (error) {
                alert(`Excel出力でエラーが発生しました: ${error.message}`);
                console.error('Excel export error:', error);
            }
        }
    };
    
})();