(function() {
    'use strict';
    
    const utils = WebChecker.core.utils;
    
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
            
            utils.showNotification('レイアウト表示を起動しました', 'success');
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
                <button onclick="WebChecker.tools.layout.deactivate()" style="
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
    
    WebChecker.tools.layout = {
        instance: null,
        
        activate: function() {
            if (!this.instance) {
                this.instance = new LayoutVisualizer();
            }
            this.instance.activate();
        },
        
        deactivate: function() {
            if (this.instance) {
                this.instance.deactivate();
            }
        }
    };
    
})();