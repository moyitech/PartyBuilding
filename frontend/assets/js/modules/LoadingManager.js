/**
 * 加载管理器
 */
export class LoadingManager {
    constructor() {
        this.loadingElement = document.getElementById('loading');
    }

    /**
     * 显示加载动画
     * @param {string} message - 加载消息
     */
    show(message = 'AI正在思考中...') {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
            const messageElement = this.loadingElement.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }

    /**
     * 隐藏加载动画
     */
    hide() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }

    /**
     * 显示加载状态
     * @param {HTMLElement} element - 元素
     * @param {boolean} loading - 是否显示加载状态
     */
    toggleElementLoading(element, loading) {
        if (loading) {
            element.disabled = true;
            element.setAttribute('data-loading', 'true');
        } else {
            element.disabled = false;
            element.removeAttribute('data-loading');
        }
    }
}