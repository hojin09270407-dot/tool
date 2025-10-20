(function() {
    'use strict';
    
    const utils = WebChecker.core.utils;
    const ui = WebChecker.core.ui;
    
    WebChecker.tools.mobile = {
        
        // スマホ品質チェック実行
        checkQuality: async function() {
            ui.createFloatingToolArea(`
                <div style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📄</div>
                    <h3 style="margin: 0; color: #333;">検証中...</h3>
                    <p style="margin: 10px 0 0 0; color: #666;">しばらくお待ちください。</p>
                </div>
            `);
            
            try {
                const results = await this.performCheck();
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
        
        // チェック実行
        performCheck: async function() {
            const viewports = {
                'iPhone SE': 375,
                'iPhone 12-14': 390,
                'Galaxy S21+': 414
            };
            
            const allIssues = {};
            const originalViewport = window.innerWidth;
            
            for (const [deviceName, width] of Object.entries(viewports)) {
                const issues = await this.checkQualityWithViewportSimulation(width);
                
                allIssues[deviceName] = {
                    width: width,
                    issues: issues,
                    isCurrentViewport: Math.abs(width - originalViewport) < 50
                };
            }
            
            return {
                currentViewport: originalViewport,
                results: allIssues,
                summary: this.generateQualitySummary(allIssues)
            };
        },
        
        // ビューポートをシミュレートしてチェック
        checkQualityWithViewportSimulation: function(targetWidth) {
            return new Promise((resolve) => {
                const iframe = document.createElement('iframe');
                iframe.style.cssText = `
                    position: fixed;
                    top: -9999px;
                    left: -9999px;
                    width: ${targetWidth}px;
                    height: 800px;
                    border: none;
                    opacity: 0;
                    pointer-events: none;
                `;
                
                document.body.appendChild(iframe);
                
                iframe.onload = () => {
                    try {
                        const iframeDoc = iframe.contentDocument;
                        iframeDoc.open();
                        iframeDoc.write(document.documentElement.outerHTML);
                        iframeDoc.close();
                        
                        const viewportMeta = iframeDoc.querySelector('meta[name="viewport"]') || 
                                        iframeDoc.createElement('meta');
                        viewportMeta.name = 'viewport';
                        viewportMeta.content = `width=${targetWidth}, initial-scale=1.0`;
                        if (!iframeDoc.querySelector('meta[name="viewport"]')) {
                            iframeDoc.head.appendChild(viewportMeta);
                        }
                        
                        setTimeout(() => {
                            const issues = this.performQualityChecksInIframe(iframeDoc, targetWidth);
                            document.body.removeChild(iframe);
                            resolve(issues);
                        }, 500);
                        
                    } catch (error) {
                        document.body.removeChild(iframe);
                        resolve([]);
                    }
                };
                
                iframe.src = 'about:blank';
            });
        },
        
        // iframe内でクオリティチェックを実行
        performQualityChecksInIframe: function(iframeDoc, viewportWidth) {
            const issues = [];
            
            // 1. 画像チェック
            const images = Array.from(iframeDoc.querySelectorAll('img'));
            images.forEach((img, index) => {
                const rect = img.getBoundingClientRect();
                const naturalWidth = img.naturalWidth;
                
                if (rect.width === 0 || rect.height === 0) return;
                
                if (rect.width > viewportWidth) {
                    const elementId = `iframe-img-${index}`;
                    
                    issues.push({
                        type: '画像表示見切れ',
                        severity: 'HIGH',
                        element: utils.getElementDescription(img),
                        elementId: elementId,
                        details: `${viewportWidth}px画面で表示幅: ${Math.round(rect.width)}px (${Math.round(rect.width - viewportWidth)}pxはみ出し)`,
                        recommendation: 'max-width: 100% を設定してください',
                        displayWidth: Math.round(rect.width),
                        viewportWidth: viewportWidth
                    });
                }
                
                if (naturalWidth > viewportWidth * 2) {
                    issues.push({
                        type: '画像サイズ過大',
                        severity: naturalWidth > viewportWidth * 3 ? 'HIGH' : 'MEDIUM',
                        element: utils.getElementDescription(img),
                        elementId: `iframe-img-size-${index}`,
                        details: `画像実サイズ: ${naturalWidth}px (推奨: ${viewportWidth * 2}px以下)`,
                        recommendation: '画像を最適化してファイルサイズを削減してください',
                        actualWidth: naturalWidth,
                        viewportWidth: viewportWidth
                    });
                }
            });
            
            // 2. 要素見切れチェック
            const elements = Array.from(iframeDoc.querySelectorAll('main *, .content *, article *, section *, div'));
            elements.forEach((element, index) => {
                const rect = element.getBoundingClientRect();
                const computedStyle = iframeDoc.defaultView.getComputedStyle(element);
                
                if (rect.width === 0 || rect.height === 0 || computedStyle.display === 'none') {
                    return;
                }
                
                if (rect.right > viewportWidth) {
                    const overflowAmount = Math.round(rect.right - viewportWidth);
                    
                    issues.push({
                        type: '要素見切れ',
                        severity: overflowAmount > 50 ? 'HIGH' : overflowAmount > 20 ? 'MEDIUM' : 'LOW',
                        element: utils.getElementDescription(element),
                        elementId: `iframe-element-${index}`,
                        details: `${viewportWidth}px画面ではみ出し: ${overflowAmount}px`,
                        recommendation: 'レスポンシブデザインの調整が必要です',
                        overflowAmount: overflowAmount,
                        viewportWidth: viewportWidth
                    });
                }
            });
            
            // 3. フォントサイズチェック
            elements.forEach((element, index) => {
                const computedStyle = iframeDoc.defaultView.getComputedStyle(element);
                const fontSize = parseFloat(computedStyle.fontSize);
                const textContent = element.textContent.trim();
                
                if (!textContent || textContent.length === 0) return;
                
                const hasTextChildren = Array.from(element.children).some(child => 
                    child.textContent.trim().length > 0
                );
                if (hasTextChildren && element.children.length > 0) return;
                
                if (fontSize <= 13) {
                    issues.push({
                        type: '小さすぎるフォント',
                        severity: fontSize <= 11 ? 'HIGH' : fontSize <= 12 ? 'MEDIUM' : 'LOW',
                        element: utils.getElementDescription(element),
                        elementId: `iframe-font-${index}`,
                        details: `フォントサイズ: ${fontSize}px (推奨: 14px以上)`,
                        recommendation: 'フォントサイズを14px以上に設定してください',
                        fontSize: fontSize,
                        textPreview: textContent.substring(0, 50) + (textContent.length > 50 ? '...' : '')
                    });
                }
            });
            
            return issues;
        },
        
        // サマリー生成
        generateQualitySummary: function(allIssues) {
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
        },
        
        // 結果表示
        displayResults: function(results) {
            const summary = results.summary;
            
            let html = `
                <h4 style="margin: 0 0 15px 0; color: #333; border-bottom: 2px solid #ddd; padding-bottom: 8px; font-size: 16px;">
                    📊 スマホクオリティチェック
                </h4>
                
                <div style="background: #f8f9fa; border: 1px solid #ddd; padding: 12px; margin: 10px 0; border-radius: 5px; font-size: 12px;">
                    <strong>📊 全体サマリー:</strong><br>
                    総問題数: ${summary.totalIssues}件 
                    (🚨重要: ${summary.highSeverity}件, ⚠️中程度: ${summary.mediumSeverity}件, 💡軽微: ${summary.lowSeverity}件)<br>
                    <strong>問題種別:</strong> ${Object.entries(summary.byType).map(([type, count]) => `${type}(${count}件)`).join(', ')}
                </div>
                
                ${Object.entries(results.results).map(([deviceName, deviceResult]) => {
                    const highIssues = deviceResult.issues.filter(issue => issue.severity === 'HIGH');
                    const currentIndicator = deviceResult.isCurrentViewport ? ' 🔍現在の画面' : '';
                    
                    return `
                        <div style="margin: 15px 0; border: 1px solid #ddd; border-radius: 5px; overflow: hidden;">
                            <div style="background: ${deviceResult.isCurrentViewport ? '#e3f2fd' : '#f5f5f5'}; padding: 10px; border-bottom: 1px solid #ddd;">
                                <strong>${deviceName} (${deviceResult.width}px)${currentIndicator}</strong>
                                - 問題数: ${deviceResult.issues.length}件
                                ${highIssues.length > 0 ? `
                                <div style="margin-top: 5px;">
                                    <strong>🚨 重要な問題:</strong>
                                    ${highIssues.map((issue, index) => 
                                        `<a href="#quality-issue-${deviceName}-${index}" style="color: #d32f2f; margin-right: 8px; text-decoration: underline; font-size: 13px;">
                                            ${issue.type}
                                        </a>`
                                    ).join('')}
                                </div>
                                ` : ''}
                            </div>
                            
                            ${deviceResult.issues.length > 0 ? `
                            <table style="${utils.tableStyle}; margin: 0;">
                                <tr>
                                    <th style="${utils.headerStyle}">重要度</th>
                                    <th style="${utils.headerStyle}">問題種別</th>
                                    <th style="${utils.headerStyle}">要素</th>
                                    <th style="${utils.headerStyle}">詳細・推奨対応</th>
                                </tr>
                                ${deviceResult.issues.map((issue, index) => {
                                    let severityColor = issue.severity === 'HIGH' ? '#d32f2f' : 
                                                    issue.severity === 'MEDIUM' ? '#f57c00' : '#689f38';
                                    let severityText = issue.severity === 'HIGH' ? '🚨 重要' : 
                                                    issue.severity === 'MEDIUM' ? '⚠️ 中程度' : '💡 軽微';
                                    
                                    return `<tr id="quality-issue-${deviceName}-${index}">
                                        <td style="${utils.cellStyle} color: ${severityColor}; font-weight: bold;">
                                            ${severityText}
                                        </td>
                                        <td style="${utils.cellStyle}">${issue.type}</td>
                                        <td style="${utils.cellStyle}">
                                            ${issue.element}
                                        </td>
                                        <td style="${utils.cellStyle}">
                                            <strong>詳細:</strong> ${issue.details}<br>
                                            <strong>推奨:</strong> ${issue.recommendation}
                                            ${issue.textPreview ? `<br><strong>テキスト:</strong> "${issue.textPreview}"` : ''}
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </table>
                            ` : `
                            <div style="padding: 15px; color: #4caf50; text-align: center; font-size: 12px;">
                                ✅ このデバイスサイズでは問題は検出されませんでした
                            </div>
                            `}
                        </div>
                    `;
                }).join('')}
            `;
            
            ui.createFloatingToolArea(html);
        }
    };
    
})();