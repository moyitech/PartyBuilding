// 工具函数
import { CONSTANTS } from './constants.js';

/**
 * HTML转义函数
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的文本
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * 检查用户是否在容器底部附近
 * @param {HTMLElement} container - 容器元素
 * @returns {boolean} 是否在底部附近
 */
export function isUserNearBottom(container) {
    return container.scrollHeight - container.scrollTop - container.clientHeight <= CONSTANTS.SCROLL_THRESHOLD;
}

/**
 * 智能滚动到底部
 * @param {HTMLElement} container - 容器元素
 */
export function smartScrollToBottom(container) {
    if (isUserNearBottom(container)) {
        container.scrollTop = container.scrollHeight;
    }
}

/**
 * 简单但有效的Markdown解析函数
 * @param {string} text - 需要解析的Markdown文本
 * @returns {string} 解析后的HTML
 */
export function parseMarkdown(text) {
    if (!text) return '';

    let html = text;

    // 处理代码块 ```code```
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="code-block" data-language="${lang || ''}"><code>${escapeHtml(code.trim())}</code></pre>`;
    });

    // 处理内联代码 `code`
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // 处理标题 # ## ### 等
    html = html.replace(/^#{6}\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#{5}\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#{4}\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>');

    // 处理粗体 **text**
    html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

    // 处理斜体 *text*
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

    // 处理链接 [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // 处理分割线 ---
    html = html.replace(/^---+$/gm, '<hr>');

    // 处理换行
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    // 包装段落
    if (html && !html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }

    // 清理多余的标签
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>)/g, '$1');
    html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<hr>)<\/p>/g, '$1');

    return html;
}

/**
 * 格式化时间
 * @param {number} seconds - 秒数
 * @returns {string} 格式化的时间字符串
 */
export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 显示Toast提示
 * @param {string} message - 提示消息
 * @param {string} type - 提示类型 (success, error, warning, info)
 * @param {number} duration - 显示时长（毫秒）
 */
export function showToast(message, type = 'info', duration = 3000) {
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${colors[type]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10001;
        font-size: 1rem;
        animation: fadeInScale 0.4s ease-out;
        max-width: 80%;
        text-align: center;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOutScale 0.3s ease-out';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

/**
 * 防止重复点击
 * @param {HTMLElement} button - 按钮元素
 * @param {number} duration - 防重复时间（毫秒）
 * @returns {boolean} 是否允许执行
 */
export function preventDuplicateClick(button, duration = CONSTANTS.DEBOUNCE_TIME) {
    if (button.disabled) return false;

    button.disabled = true;
    const originalText = button.textContent;

    setTimeout(() => {
        button.disabled = false;
        button.textContent = originalText;
    }, duration);

    return true;
}

/**
 * 调整文本域高度
 * @param {HTMLTextAreaElement} textarea - 文本域元素
 * @param {number} maxHeight - 最大高度
 */
export function adjustTextareaHeight(textarea, maxHeight = 120) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
}