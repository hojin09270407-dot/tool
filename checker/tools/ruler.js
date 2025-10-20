(function() {
    'use strict';
    
    const utils = WebChecker.core.utils;
    
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
            utils.showNotification('オブジェクト定規を起動しました', 'success');
        }

        deactivate() {
            this.isActive = false;
            document.removeEventListener('mousemove', this.boundOnMouseMove);
            document.removeEventListener('mouseup', this.boundOnMouseUp);
            this.removeRuler();
            this.removeAllCopiedRulers();
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
            
            utils.showNotification('定規をコピーしました', 'success');
        }

        setupCopyRulerEvents(ruler) {
            let isDragging = false;
            let isResizing = false;
            let resizeHandle = '';
            let startX = 0;
            let startY = 0;

            ruler.classList.add('copied-ruler');

            const copyButton = ruler.querySelector('.copy-button');
            if (copyButton) {
                copyButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.copySpecificRuler(ruler);
                });
            }

            const closeButton = ruler.querySelector('.close-button');
            if (closeButton) {
                closeButton.innerHTML = '🗑️';
                closeButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    ruler.remove();
                    const index = this.copiedRulers.indexOf(ruler);
                    if (index > -1) this.copiedRulers.splice(index, 1);
                    utils.showNotification('定規を削除しました', 'info');
                });
            }

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
            
            utils.showNotification('定規をコピーしました', 'success');
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
    
    WebChecker.tools.ruler = {
        instance: null,
        
        activate: function() {
            if (!this.instance) {
                this.instance = new ObjectRuler();
            }
            this.instance.activate();
        }
    };
    
})();