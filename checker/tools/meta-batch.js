(function() {
    'use strict';
    
    const utils = WebChecker.core.utils;
    const ui = WebChecker.core.ui;
    
    WebChecker.batch.metaBatch = {
        
        // meta一括チェック画面を表示
        show: function() {
            const batchHTML = `
                <h4 style="margin: 0 0 20px 0; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px; font-size: 18px; font-weight: 600;">
                    📊 metaタグ一括チェック
                </h4>
                
                <div style="margin-bottom: 15px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 8px;">調査対象URL(1行1URL):</label>
                    <textarea id="batch-meta-urls" placeholder="調査したいURLを1行ずつ入力してください&#10;例:&#10;https://example.com&#10;https://example.com/page1&#10;https://example.com/page2" 
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
            
            ui.createFloatingToolArea(batchHTML);
            
            setTimeout(() => {
                const startButton = document.getElementById('start-batch-meta-check');
                if (startButton) {
                    startButton.addEventListener('click', () => this.startBatchCheck());
                }
                
                const exportButton = document.getElementById('export-meta-excel');
                if (exportButton) {
                    exportButton.addEventListener('click', () => this.exportToExcel());
                }
            }, 100);
        },
        
        // 一括チェック開始
        startBatchCheck: async function() {
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
            
            document.getElementById('batch-meta-progress').style.display = 'block';
            document.getElementById('start-batch-meta-check').disabled = true;
            document.getElementById('start-batch-meta-check').textContent = '処理中...';
            
            const progressBar = document.getElementById('meta-progress-bar');
            const progressText = document.getElementById('meta-progress-text');
            const progressDetails = document.getElementById('meta-progress-details');
            
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
                        
                        progressDetails.innerHTML += `<div style="color: green;">✅ ${url} - 完了</div>`;
                    } catch (error) {
                        allResults.push({
                            url: url,
                            error: error.message,
                            meta: []
                        });
                        
                        progressDetails.innerHTML += `<div style="color: red;">❌ ${url} - エラー: ${error.message}</div>`;
                    }
                    
                    progressDetails.scrollTop = progressDetails.scrollHeight;
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                
                progressText.textContent = `完了! ${urls.length}件のURL処理が終了しました`;
                document.getElementById('export-meta-excel').disabled = false;
                document.getElementById('batch-meta-results').style.display = 'block';
                
                this.displaySummary(allResults);
                window.batchMetaCheckResults = allResults;
                
            } catch (error) {
                progressText.textContent = `エラーが発生しました: ${error.message}`;
                progressDetails.innerHTML += `<div style="color: red;">❌ 処理中断: ${error.message}</div>`;
            } finally {
                document.getElementById('start-batch-meta-check').disabled = false;
                document.getElementById('start-batch-meta-check').textContent = '🚀 一括チェック開始';
            }
        },
        
        // 単一URLのmetaタグチェック
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
                                    const currentUrlClean = utils.normalizeUrl(url);
                                    const canonicalUrlClean = utils.normalizeUrl(content);
                                    
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
        },
        
        // サマリー表示
        displaySummary: function(results) {
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
        },
        
        // Excel出力
        exportToExcel: function() {
            if (!window.batchMetaCheckResults) {
                alert('エクスポートするデータがありません');
                return;
            }
            
            try {
                const workbook = XLSX.utils.book_new();
                
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
                
                const summaryData = window.batchMetaCheckResults.map(result => ({
                    'URL': result.url,
                    '処理結果': result.error ? 'エラー' : '成功',
                    'エラー内容': result.error || '-',
                    '調査日時': result.timestamp || new Date().toLocaleString()
                }));
                
                const summarySheet = XLSX.utils.json_to_sheet(summaryData);
                XLSX.utils.book_append_sheet(workbook, summarySheet, "調査サマリー");
                
                const timestamp = new Date().toISOString().slice(0, 19).replace(/[:\-T]/g, '');
                const filename = `metaタグ一括調査結果_${timestamp}.xlsx`;
                
                XLSX.writeFile(workbook, filename);
                
                alert(`Excel ファイル "${filename}" をダウンロードしました!`);
                
            } catch (error) {
                alert(`Excel出力でエラーが発生しました: ${error.message}`);
                console.error('Excel export error:', error);
            }
        }
    };
    
})();