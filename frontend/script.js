// 智慧思政智能体平台 JavaScript 功能

// 全局变量
let currentAgent = null;
let isModalOpen = false;
const baseURL = ''; // 基础URL，根据部署环境配置
let userScrolledUp = false; // 用户是否向上滚动
let lastScrollTop = 0; // 记录上次滚动位置

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('智慧思政智能体平台已加载');

    // 加载智能体模板
    loadAgentTemplates();

    // 为所有输入框添加回车键监听
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (e.target.id === 'policy-input') {
                // Shift+Enter 换行，Enter 发送
                if (!e.shiftKey) {
                    e.preventDefault();
                    sendPolicyMessage();
                }
            } else if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // 查找最近的生成按钮
                const form = e.target.closest('.agent-form');
                const generateBtn = form.querySelector('.generate-btn');
                if (generateBtn && !generateBtn.disabled) {
                    generateBtn.click();
                }
            }
        }
    });

    // 为policy-input添加自动调整高度功能
    document.addEventListener('input', function(e) {
        if (e.target.id === 'policy-input') {
            const textarea = e.target;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    });

    // 使用事件委托监听动态创建的元素
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('chat-textarea')) {
            const textarea = e.target;
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        }
    });

    // 点击弹窗外部关闭弹窗
    document.getElementById('agentModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });

    // ESC键关闭弹窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isModalOpen) {
            closeModal();
        }
    });
});

// 加载智能体模板
async function loadAgentTemplates() {
    try {
        const response = await fetch('agent-templates.html');
        const templateHtml = await response.text();

        // 创建临时div来解析模板
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = templateHtml;

        // 将模板添加到body中（保持隐藏状态）
        while (tempDiv.firstChild) {
            document.body.appendChild(tempDiv.firstChild);
        }
    } catch (error) {
        console.error('加载智能体模板失败:', error);
    }
}

// 打开智能体弹窗
function openAgent(agentType) {
    currentAgent = agentType;
    const modal = document.getElementById('agentModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    // 设置标题
    const titles = {
        'policy': '政策智能问答',
        'organization': '常规组织生活设计',
        'immersive': '沉浸式组织生活设计',
        'music': '音乐智能体',
        'history': '党史情景生成',
        'policy-visual': '绘声绘色政策解读'
    };
    modalTitle.textContent = titles[agentType] || '智能体';

    // 加载对应的模板内容
    const template = document.getElementById(`${agentType}-template`);
    if (template) {
        modalBody.innerHTML = template.innerHTML;
    } else {
        modalBody.innerHTML = '<p>正在加载智能体...</p>';
    }

    // 显示弹窗
    modal.classList.add('show');
    isModalOpen = true;
    document.body.style.overflow = 'hidden';
}

// 关闭弹窗
function closeModal() {
    const modal = document.getElementById('agentModal');
    modal.classList.remove('show');
    isModalOpen = false;
    document.body.style.overflow = '';

    // 清空弹窗内容
    setTimeout(() => {
        document.getElementById('modalBody').innerHTML = '';
    }, 300);
}

// 显示加载动画
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

// 隐藏加载动画
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// 显示结果
function showResult(title, content) {
    const resultSection = document.getElementById('result-section');
    const resultTitle = document.getElementById('result-title');
    const resultContent = document.getElementById('result-content');

    resultTitle.textContent = title;
    resultContent.innerHTML = content;
    resultSection.style.display = 'block';

    // 滚动到结果区域
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 关闭结果
function closeResult() {
    document.getElementById('result-section').style.display = 'none';
}

// 格式化生成结果
function formatResult(content, type) {
    switch (type) {
        case 'organization':
            return formatOrganizationPlan(content);
        case 'immersive':
            return formatImmersivePlan(content);
        case 'history':
            return formatHistoryScenario(content);
        case 'policy-visual':
            return formatPolicyVisual(content);
        default:
            return `<p>${content}</p>`;
    }
}

// 格式化组织生活方案
function formatOrganizationPlan(content) {
    let formatted = '';

    // 如果是 JSON 对象，解析后格式化
    try {
        const plan = typeof content === 'string' ? JSON.parse(content) : content;

        if (plan.title) {
            formatted += `<h3>${plan.title}</h3>`;
        }

        if (plan.theme) {
            formatted += `<p><strong>主题：</strong>${plan.theme}</p>`;
        }

        if (plan.duration) {
            formatted += `<p><strong>时长：</strong>${plan.duration}</p>`;
        }

        if (plan.audience) {
            formatted += `<p><strong>参与对象：</strong>${plan.audience}</p>`;
        }

        if (plan.objectives) {
            formatted += `<h4>活动目标</h4><ul>`;
            plan.objectives.forEach(obj => {
                formatted += `<li>${obj}</li>`;
            });
            formatted += '</ul>';
        }

        if (plan.agenda) {
            formatted += `<h4>活动流程</h4><ol>`;
            plan.agenda.forEach(item => {
                formatted += `<li>${item}</li>`;
            });
            formatted += '</ol>';
        }

        if (plan.materials) {
            formatted += `<h4>学习资料</h4><ul>`;
            plan.materials.forEach(material => {
                formatted += `<li>${material}</li>`;
            });
            formatted += '</ul>';
        }

    } catch (e) {
        // 如果不是 JSON，直接显示内容
        formatted = `<div class="formatted-text">${content.replace(/\n/g, '<br>')}</div>`;
    }

    return formatted;
}

// 格式化沉浸式方案
function formatImmersivePlan(content) {
    let formatted = '';

    try {
        const plan = typeof content === 'string' ? JSON.parse(content) : content;

        if (plan.title) {
            formatted += `<h3>${plan.title}</h3>`;
        }

        if (plan.description) {
            formatted += `<p>${plan.description}</p>`;
        }

        if (plan.activities) {
            formatted += `<h4>活动环节</h4>`;
            plan.activities.forEach((activity, index) => {
                formatted += `<div class="activity-block">
                    <h5>环节 ${index + 1}: ${activity.name}</h5>
                    <p>${activity.description}</p>
                    ${activity.code_example ? `<pre><code>${activity.code_example}</code></pre>` : ''}
                    ${activity.task ? `<p><strong>任务：</strong>${activity.task}</p>` : ''}
                </div>`;
            });
        }

    } catch (e) {
        formatted = `<div class="formatted-text">${content.replace(/\n/g, '<br>')}</div>`;
    }

    return formatted;
}

// 格式化历史情景
function formatHistoryScenario(content) {
    let formatted = '';

    try {
        const scenario = typeof content === 'string' ? JSON.parse(content) : content;

        if (scenario.title) {
            formatted += `<h3>${scenario.title}</h3>`;
        }

        if (scenario.background) {
            formatted += `<h4>历史背景</h4><p>${scenario.background}</p>`;
        }

        if (scenario.scene) {
            formatted += `<h4>场景描述</h4><p>${scenario.scene}</p>`;
        }

        if (scenario.characters) {
            formatted += `<h4>主要人物</h4><ul>`;
            scenario.characters.forEach(character => {
                formatted += `<li><strong>${character.name}:</strong> ${character.role}</li>`;
            });
            formatted += '</ul>';
        }

        if (scenario.dialogue) {
            formatted += `<h4>情景对话</h4>`;
            scenario.dialogue.forEach(item => {
                formatted += `<p><strong>${item.speaker}:</strong> ${item.text}</p>`;
            });
        }

        if (scenario.video_script) {
            formatted += `<h4>视频脚本</h4><pre>${scenario.video_script}</pre>`;
        }

    } catch (e) {
        formatted = `<div class="formatted-text">${content.replace(/\n/g, '<br>')}</div>`;
    }

    return formatted;
}

// 格式化政策解读
function formatPolicyVisual(content) {
    let formatted = '';

    try {
        const policy = typeof content === 'string' ? JSON.parse(content) : content;

        if (policy.title) {
            formatted += `<h3>${policy.title}</h3>`;
        }

        if (policy.summary) {
            formatted += `<p><strong>政策要点：</strong>${policy.summary}</p>`;
        }

        if (policy.type === 'h5') {
            if (policy.sections) {
                formatted += `<h4>H5图文内容</h4>`;
                policy.sections.forEach(section => {
                    formatted += `<div class="h5-section">
                        <h5>${section.heading}</h5>
                        <p>${section.content}</p>
                        ${section.image ? `<p><em>[配图：${section.image}]</em></p>` : ''}
                    </div>`;
                });
            }
        } else if (policy.type === 'video') {
            if (policy.script) {
                formatted += `<h4>短视频脚本</h4><pre>${policy.script}</pre>`;
            }
            if (policy.duration) {
                formatted += `<p><strong>视频时长：</strong>${policy.duration}</p>`;
            }
        } else if (policy.type === 'quiz') {
            if (policy.questions) {
                formatted += `<h4>互动测试题</h4>`;
                policy.questions.forEach((q, index) => {
                    formatted += `<div class="quiz-question">
                        <p><strong>${index + 1}. ${q.question}</strong></p>
                        <ul>`;
                    q.options.forEach(option => {
                        formatted += `<li>${option}</li>`;
                    });
                    formatted += `</ul>
                        <p><strong>答案：</strong>${q.answer}</p>
                    </div>`;
                });
            }
        }

    } catch (e) {
        formatted = `<div class="formatted-text">${content.replace(/\n/g, '<br>')}</div>`;
    }

    return formatted;
}

// 简单但有效的Markdown解析函数
function parseMarkdown(text) {
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

    // 处理有序列表 1. item
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');

    // 处理无序列表 - item 或 * item
    html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // 修复嵌套列表的问题
    html = html.replace(/<\/ol>\s*<ol>/g, '');
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    // 处理引用 > text
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    html = html.replace(/(<blockquote>.*<\/blockquote>)/s, (match) => {
        // 处理多行引用
        return match.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');
    });

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
    html = html.replace(/<p>(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ol>|<ul>)/g, '$1');
    html = html.replace(/(<\/ol>|<\/ul>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre)/g, '$1');
    html = html.replace(/(<\/pre>)<\/p>/g, '$1');

    return html;
}

// HTML转义函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 检查用户是否滚动到底部附近
function isUserNearBottom(container) {
    const threshold = 100; // 100px 阈值
    return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
}

// 智能滚动函数
function smartScrollToBottom(container) {
    if (isUserNearBottom(container)) {
        // 只有当用户在底部附近时才自动滚动
        container.scrollTop = container.scrollHeight;
    }
}

// 政策智能问答功能
async function sendPolicyMessage() {
    const input = document.getElementById('policy-input');
    const messages = document.getElementById('policy-chat-messages');
    const message = input.value.trim();

    if (!message) return;

    // 添加用户消息
    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    const userContent = document.createElement('div');
    userContent.className = 'message-content';
    userContent.textContent = message;
    userMessage.appendChild(userContent);
    messages.appendChild(userMessage);

    // 清空输入框并重置高度
    input.value = '';
    input.style.height = 'auto';

    // 显示思考中的消息
    const thinkingMessage = document.createElement('div');
    thinkingMessage.className = 'message bot';
    const thinkingContent = document.createElement('div');
    thinkingContent.className = 'message-content';
    thinkingContent.innerHTML = '<span class="thinking-indicator">正在思考中<span class="thinking-dots">...</span></span>';
    thinkingMessage.appendChild(thinkingContent);
    messages.appendChild(thinkingMessage);

    // 滚动到底部
    messages.scrollTop = messages.scrollHeight;

    try {
        // 创建流式响应的消息容器
        const botMessageContainer = document.createElement('div');
        botMessageContainer.className = 'message bot streaming';
        const botContent = document.createElement('div');
        botContent.className = 'message-content';
        botMessageContainer.appendChild(botContent);
        messages.insertBefore(botMessageContainer, thinkingMessage);

        // 移除思考中的消息
        messages.removeChild(thinkingMessage);

        // 简化的滚动控制：只有当用户主动向上滚动时才停止自动滚动
        let userScrolledUp = false;
        let scrollTimeout;

        const handleUserScroll = () => {
            const isNearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight <= 150;

            if (!isNearBottom) {
                userScrolledUp = true;
            } else {
                userScrolledUp = false;
            }

            // 清除之前的timeout
            clearTimeout(scrollTimeout);

            // 2秒后重置手动滚动标记
            scrollTimeout = setTimeout(() => {
                userScrolledUp = false;
            }, 2000);
        };

        messages.addEventListener('scroll', handleUserScroll, { passive: true });

        // 构建对话历史上下文（不包含当前用户输入）
        const context_messages = [];
        const messageElements = messages.querySelectorAll('.message');

        // 如果存在历史对话，构建上下文（排除当前用户输入）
        if (messageElements.length > 2) { // 欢迎语 + 用户输入 + AI回复 至少3条消息
            // 跳过第一个消息（欢迎语）和最后一个用户输入（当前输入）
            for (let i = 1; i < messageElements.length - 1; i++) {
                const msgElement = messageElements[i];
                const contentElement = msgElement.querySelector('.message-content');

                if (contentElement) {
                    const content = contentElement.textContent || contentElement.innerText;
                    const role = msgElement.classList.contains('user') ? 'user' : 'assistant';

                    // 只添加非空内容
                    if (content && content.trim()) {
                        context_messages.push({
                            role: role,
                            content: content.trim()
                        });
                    }
                }
            }
        }

        // 准备请求数据
        const requestData = {
            user_input: message,
            context_messages: context_messages
        };

        // 发送流式请求
        const response = await fetch(baseURL + '/policy_agent/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';

        // 处理流式数据
        while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');

            // 保留最后一个不完整的行
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '') continue;

                // 处理SSE格式数据
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();

                    if (data === '[DONE]') {
                        // 流结束，移除streaming类
                        botMessageContainer.classList.remove('streaming');
                        return;
                    }

                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.content || parsed.choices?.[0]?.delta?.content || '';

                        if (content) {
                            accumulatedText += content;
                            // 使用parseMarkdown解析内容并更新到message-content
                            const messageContent = botMessageContainer.querySelector('.message-content');
                            if (messageContent) {
                                messageContent.innerHTML = parseMarkdown(accumulatedText);
                            }

                            // 强制重新计算容器高度
                            messages.style.height = 'auto';
                            messages.offsetHeight; // 触发重排
                            messages.style.height = '';

                            // 智能滚动：只有当用户在底部且没有手动滚动时才自动滚动
                            setTimeout(() => {
                                if (!userScrolledUp) {
                                    messages.scrollTop = messages.scrollHeight;
                                }
                            }, 10);
                        }
                    } catch (e) {
                        // 如果不是JSON格式，直接使用原始文本
                        if (data) {
                            accumulatedText += data;
                            // 使用parseMarkdown解析内容并更新到message-content
                            const messageContent = botMessageContainer.querySelector('.message-content');
                            if (messageContent) {
                                messageContent.innerHTML = parseMarkdown(accumulatedText);
                            }

                            // 强制重新计算容器高度
                            messages.style.height = 'auto';
                            messages.offsetHeight; // 触发重排
                            messages.style.height = '';

                            // 智能滚动：只有当用户在底部且没有手动滚动时才自动滚动
                            setTimeout(() => {
                                if (!userScrolledUp) {
                                    messages.scrollTop = messages.scrollHeight;
                                }
                            }, 10);
                        }
                    }
                }
            }
        }

        // 处理最后的buffer
        if (buffer.trim()) {
            if (buffer.startsWith('data: ')) {
                const data = buffer.slice(6).trim();
                if (data !== '[DONE]') {
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.content || parsed.choices?.[0]?.delta?.content || '';
                        if (content) {
                            accumulatedText += content;
                            botMessageContainer.innerHTML = parseMarkdown(accumulatedText);
                        }
                    } catch (e) {
                        if (data) {
                            accumulatedText += data;
                            botMessageContainer.innerHTML = parseMarkdown(accumulatedText);
                        }
                    }
                }
            }
        }

        // 流结束，移除streaming类
        botMessageContainer.classList.remove('streaming');

        // 清理滚动监听器
        messages.removeEventListener('scroll', handleUserScroll);
        clearTimeout(scrollTimeout);

        // 重置全局变量
        userScrolledUp = false;
        lastScrollTop = 0;

    } catch (error) {
        console.error('政策问答错误:', error);

        // 移除思考中的消息和可能的streaming消息
        const streamingMessage = messages.querySelector('.message.streaming');
        if (streamingMessage && streamingMessage.parentNode) {
            streamingMessage.parentNode.removeChild(streamingMessage);
        }
        if (thinkingMessage.parentNode) {
            messages.removeChild(thinkingMessage);
        }

        // 添加错误消息
        const errorMessage = document.createElement('div');
        errorMessage.className = 'message bot error';
        errorMessage.textContent = '抱歉，网络连接出现问题，请稍后重试。';
        messages.appendChild(errorMessage);
    }

    // 不强制滚动到底部，尊重用户的滚动位置
}

// 常规组织生活设计
async function generateOrgPlan() {
    const theme = document.getElementById('org-theme').value.trim();
    const duration = document.getElementById('org-duration').value;
    const audience = document.getElementById('org-audience').value;

    if (!theme || !duration || !audience) {
        alert('请填写所有参数');
        return;
    }

    showLoading();
    currentAgent = 'organization';

    try {
        const response = await fetch(baseURL + '/api/organization/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                theme: theme,
                duration: duration,
                audience: audience
            })
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            const formattedContent = formatResult(data.plan, 'organization');
            showResult('组织生活方案', formattedContent);
        } else {
            alert('生成失败：' + (data.error || '未知错误'));
        }

    } catch (error) {
        hideLoading();
        console.error('生成组织生活方案错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 沉浸式组织生活设计
async function generateImmersivePlan() {
    const keyword = document.getElementById('immersive-keyword').value.trim();

    if (!keyword) {
        alert('请输入关键词');
        return;
    }

    showLoading();
    currentAgent = 'immersive';

    try {
        const response = await fetch(baseURL + '/api/immersive/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                keyword: keyword
            })
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            const formattedContent = formatResult(data.plan, 'immersive');
            showResult('沉浸式组织生活方案', formattedContent);
        } else {
            alert('生成失败：' + (data.error || '未知错误'));
        }

    } catch (error) {
        hideLoading();
        console.error('生成沉浸式方案错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 音乐智能体 - 生成提示词
async function generateMusicPrompt() {
    const promptDiv = document.getElementById('generated-prompt');
    const promptBtn = event.target.closest('.prompt-btn');

    // 禁用按钮
    promptBtn.disabled = true;
    promptBtn.innerHTML = '<span class="btn-icon">⏳</span> 生成中...';

    try {
        const response = await fetch(baseURL + '/music/prompt_generate');
        const data = await response.json();

        if (data.prompt) {
            // 将生成的提示词填入关键词输入框
            document.getElementById('music-keyword').value = data.prompt;

            // 填充其他参数到对应的表单字段
            if (data.gender) {
                document.getElementById('music-gender').value = data.gender;
            }
            if (data.genre) {
                document.getElementById('music-genre').value = data.genre;
            }
            if (data.mood) {
                document.getElementById('music-mood').value = data.mood;
            }
        } else {
            alert('生成提示词失败，请重试');
        }

    } catch (error) {
        console.error('生成音乐提示词错误:', error);
        alert('网络错误，请稍后重试');
    } finally {
        // 恢复按钮
        promptBtn.disabled = false;
        promptBtn.innerHTML = '<span class="btn-icon">🎲</span> 自动生成提示词';
    }
}

// 音乐智能体 - 生成音乐
async function generateMusic() {
    const prompt = document.getElementById('music-keyword').value.trim();
    const gender = document.getElementById('music-gender').value;
    const genre = document.getElementById('music-genre').value;
    const mood = document.getElementById('music-mood').value;

    if (!prompt) {
        alert('请输入关键词');
        return;
    }

    showLoading();
    currentAgent = 'music';

    try {
        const response = await fetch(baseURL + '/music/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                gender: gender || undefined,
                genre: genre || undefined,
                mood: mood || undefined
            })
        });

        const data = await response.json();
        hideLoading();

        // 映射英文到中文显示
        const genderMap = {
            'Male': '男声',
            'Female': '女声'
        };

        const genreMap = {
            'Folk': '民谣',
            'Pop': '流行',
            'Rock': '摇滚',
            'Chinese Style': '中国风',
            'Hip Hop/Rap': '嘻哈/说唱',
            'R&B/Soul': 'R&B/灵魂乐',
            'Punk': '朋克',
            'Electronic': '电子音乐',
            'Jazz': '爵士',
            'Reggae': '雷鬼',
            'DJ': 'DJ舞曲'
        };

        const moodMap = {
            'Happy': '欢快',
            'Dynamic/Energetic': '活力/激昂',
            'Sentimental/Melancholic/Lonely': '感性/忧郁/孤独',
            'Inspirational/Hopeful': '励志/希望',
            'Nostalgic/Memory': '怀旧/回忆',
            'Excited': '兴奋',
            'Sorrow/Sad': '悲伤',
            'Chill': '轻松',
            'Romantic': '浪漫'
        };

        if (data.music_url) {
            // 在音乐智能体弹窗中显示播放器
            const musicPreview = document.getElementById('music-preview');
            const musicPlayerContainer = document.getElementById('music-player-container');

            if (musicPreview && musicPlayerContainer) {
                // 显示音乐播放器和歌词
                musicPlayerContainer.innerHTML = `
                    <div class="audio-enhanced">
                        <div class="audio-info">🎵 您生成的红色主题音乐</div>
                        <div id="loading-cache" style="text-align: center; color: white; padding: 20px;">
                            <div style="font-size: 1.1rem; margin-bottom: 10px;">🔄 正在缓存音频文件...</div>
                            <div style="font-size: 0.9rem; opacity: 0.8;">这可能需要几秒钟时间</div>
                        </div>
                        <div id="audio-player" style="display: none;">
                            <!-- 隐藏的原生音频元素 -->
                            <audio preload="auto" id="music-audio-element"></audio>

                            <!-- 自定义音频播放器 -->
                            <div class="custom-audio-player">
                                <button class="play-pause-btn" id="play-pause-btn">
                                    <span id="play-icon">▶</span>
                                </button>

                                <div class="audio-time" id="current-time">0:00</div>

                                <div class="audio-timeline" id="audio-timeline">
                                    <div class="audio-progress" id="audio-progress">
                                        <div class="audio-thumb" id="audio-thumb"></div>
                                    </div>
                                </div>

                                <div class="audio-time" id="duration">0:00</div>

                                <div class="volume-control">
                                    <span class="volume-icon" id="volume-icon">🔊</span>
                                    <div class="volume-slider" id="volume-slider">
                                        <div class="volume-progress"></div>
                                        <div class="volume-thumb"></div>
                                    </div>
                                </div>
                            </div>

                            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 15px;">
                                <a href="${data.music_url}" target="_blank" download style="
                                    background: rgba(255, 255, 255, 0.2);
                                    color: white;
                                    padding: 0.6rem 1.2rem;
                                    text-decoration: none;
                                    border-radius: 8px;
                                    font-size: 0.9rem;
                                    border: 1px solid rgba(255, 255, 255, 0.3);
                                    transition: all 0.3s ease;
                                " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                                   onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                                    📥 下载音乐
                                </a>
                                <button onclick="copyLyrics()" style="
                                    background: rgba(255, 255, 255, 0.2);
                                    color: white;
                                    border: 1px solid rgba(255, 255, 255, 0.3);
                                    padding: 0.6rem 1.2rem;
                                    border-radius: 8px;
                                    cursor: pointer;
                                    font-size: 0.9rem;
                                    transition: all 0.3s ease;
                                " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                                   onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
                                    📝 复制歌词
                                </button>
                            </div>
                        </div>
                        <div id="lyrics-container" style="display: none; margin-top: 1.5rem; padding: 1rem; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
                            <h5 style="color: white; margin-bottom: 1rem; text-align: center;">🎤 歌词</h5>
                            <div id="lyrics-scroll" style="max-height: 200px; overflow-y: auto; padding: 0 10px;">
                                <div id="lyrics-content" style="color: white; line-height: 1.6; font-size: 0.9rem;">
                                    <!-- 歌词将在这里显示 -->
                                </div>
                            </div>
                        </div>
                        <div id="cache-status" style="margin-top: 10px; color: white; text-align: center; font-size: 0.8rem; opacity: 0.8;">
                            💾 音频已缓存到服务器，可无限次播放
                        </div>
                    </div>
                `;
                musicPreview.style.display = 'block';

                // 直接显示本地缓存的音频和歌词
                displayLocalCachedAudio(data.music_url, data.audio_captions);
            }

            // 显示成功提示（非阻塞式，屏幕正中间）
            setTimeout(() => {
                const tempAlert = document.createElement('div');
                tempAlert.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #4caf50;
                    color: white;
                    padding: 1.2rem 2rem;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.25);
                    z-index: 10000;
                    font-size: 1.1rem;
                    font-weight: 600;
                    animation: fadeInScale 0.4s ease-out;
                `;
                tempAlert.textContent = '🎵 音乐生成成功！正在缓存音频...';
                document.body.appendChild(tempAlert);

                setTimeout(() => {
                    tempAlert.style.animation = 'fadeOutScale 0.3s ease-out';
                    setTimeout(() => {
                        tempAlert.remove();
                    }, 300);
                }, 2000);
            }, 100);

        } else {
            alert('生成失败：' + (data.error || '未知错误'));
        }

    } catch (error) {
        hideLoading();
        console.error('生成音乐错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 显示本地缓存的音频（后端已处理缓存）
function displayLocalCachedAudio(audioUrl, audioCaptions) {
    console.log('显示本地缓存的音频:', audioUrl);

    // 更新UI显示音频播放器
    const loadingDiv = document.getElementById('loading-cache');
    const audioPlayerDiv = document.getElementById('audio-player');
    const lyricsContainer = document.getElementById('lyrics-container');
    const cacheStatusDiv = document.getElementById('cache-status');

    if (loadingDiv) loadingDiv.style.display = 'none';
    if (audioPlayerDiv) {
        audioPlayerDiv.style.display = 'block';
        const audioElement = document.getElementById('music-audio-element');
        if (audioElement) {
            audioElement.src = audioUrl;
            audioElement.preload = 'auto';

            // 设置自定义播放器
            setupCustomAudioPlayer();
        }
    }
    if (cacheStatusDiv) {
        cacheStatusDiv.textContent = '💾 音频已缓存到服务器，可无限次播放';
        cacheStatusDiv.style.color = '#4caf50';
        cacheStatusDiv.fontWeight = 'bold';
    }

    // 处理和显示歌词
    if (audioCaptions && lyricsContainer) {
        displayLyrics(audioCaptions);
        lyricsContainer.style.display = 'block';
    }

    // 显示加载成功提示
    const successToast = document.createElement('div');
    successToast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #4caf50;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        z-index: 10001;
        font-size: 1rem;
        animation: fadeInScale 0.4s ease-out;
    `;
    successToast.textContent = '✅ 音乐生成成功！可以开始播放';
    document.body.appendChild(successToast);

    setTimeout(() => {
        successToast.style.animation = 'fadeOutScale 0.3s ease-out';
        setTimeout(() => {
            successToast.remove();
        }, 300);
    }, 2000);
}

// 设置自定义音频播放器
function setupCustomAudioPlayer() {
    const audio = document.getElementById('music-audio-element');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const timeline = document.getElementById('audio-timeline');
    const progress = document.getElementById('audio-progress');
    const thumb = document.getElementById('audio-thumb');

    if (!audio || !playPauseBtn) return;

    let isDragging = false;

    // 播放/暂停功能
    playPauseBtn.addEventListener('click', () => {
        if (audio.paused) {
            audio.play();
            playIcon.textContent = '⏸';
        } else {
            audio.pause();
            playIcon.textContent = '▶';
        }
    });

    // 更新时间显示
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // 音频元数据加载完成
    audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio.duration);
    });

    // 更新进度条
    audio.addEventListener('timeupdate', () => {
        const current = audio.currentTime;
        const duration = audio.duration;

        if (!isNaN(duration)) {
            const progressPercent = (current / duration) * 100;
            progress.style.width = progressPercent + '%';
            thumb.style.left = progressPercent + '%';
            currentTimeEl.textContent = formatTime(current);
        }
    });

    // 音频结束
    audio.addEventListener('ended', () => {
        playIcon.textContent = '▶';
        progress.style.width = '0%';
        thumb.style.left = '0%';
        currentTimeEl.textContent = '0:00';
    });

    // 进度条点击跳转
    timeline.addEventListener('click', (e) => {
        const rect = timeline.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = clickX / rect.width;

        if (!isNaN(audio.duration)) {
            audio.currentTime = percent * audio.duration;
        }
    });

    // 拖动进度条
    timeline.addEventListener('mousedown', (e) => {
        isDragging = true;
        // 记住当前播放状态
        audio.dataset.wasPlaying = !audio.paused;
        updateProgressFromMouse(e);
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            updateProgressFromMouse(e);
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (isDragging) {
            isDragging = false;
            const rect = timeline.getBoundingClientRect();
            const mousePercent = (e.clientX - rect.left) / rect.width;
            if (!isNaN(audio.duration)) {
                audio.currentTime = mousePercent * audio.duration;
            }

            // 如果之前在播放，继续播放
            if (audio.dataset.wasPlaying === 'true') {
                audio.play().catch(err => console.log('自动播放失败:', err));
            }
            delete audio.dataset.wasPlaying;
        }
    });

    function updateProgressFromMouse(e) {
        const rect = timeline.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, clickX / rect.width));

        progress.style.width = (percent * 100) + '%';
        thumb.style.left = (percent * 100) + '%';

        if (!isNaN(audio.duration)) {
            currentTimeEl.textContent = formatTime(percent * audio.duration);
        }
    }

    // 音量控制
    const volumeIcon = document.getElementById('volume-icon');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeProgress = volumeSlider ? volumeSlider.querySelector('.volume-progress') : null;
    const volumeThumb = volumeSlider ? volumeSlider.querySelector('.volume-thumb') : null;

    if (volumeSlider && volumeProgress && volumeThumb) {
        let isDraggingVolume = false;

        function updateVolume(percent) {
            const volume = Math.max(0, Math.min(1, percent));
            audio.volume = volume;
            volumeProgress.style.width = (volume * 100) + '%';
            volumeThumb.style.left = (volume * 100) + '%';

            // 更新音量图标
            if (volume === 0 || audio.muted) {
                volumeIcon.textContent = '🔇';
            } else if (volume < 0.5) {
                volumeIcon.textContent = '🔉';
            } else {
                volumeIcon.textContent = '🔊';
            }
        }

        function updateVolumeFromMouse(e) {
            const rect = volumeSlider.getBoundingClientRect();
            const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            updateVolume(percent);
        }

        // 音量滑块拖拽功能
        volumeSlider.addEventListener('mousedown', (e) => {
            isDraggingVolume = true;
            updateVolumeFromMouse(e);
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (isDraggingVolume) {
                updateVolumeFromMouse(e);
            }
        });

        document.addEventListener('mouseup', () => {
            isDraggingVolume = false;
        });

        volumeSlider.addEventListener('click', (e) => {
            if (!isDraggingVolume) {
                updateVolumeFromMouse(e);
            }
        });

        volumeIcon.addEventListener('click', () => {
            if (audio.muted) {
                audio.muted = false;
                updateVolume(audio.volume);
            } else {
                audio.muted = true;
                volumeProgress.style.width = '0%';
                volumeThumb.style.left = '0%';
                volumeIcon.textContent = '🔇';
            }
        });

        // 初始化音量
        updateVolume(audio.volume);
    }
}

// 显示歌词
function displayLyrics(audioCaptions) {
    try {
        // 解析歌词数据
        const captionsData = typeof audioCaptions === 'string' ? JSON.parse(audioCaptions) : audioCaptions;

        if (captionsData.utterances && captionsData.utterances.length > 0) {
            const lyricsContent = document.getElementById('lyrics-content');
            if (!lyricsContent) return;

            // 过滤掉音乐标记（如[intro]、[verse]等），只保留歌词文本
            // 同时保留原始索引用于同步
            const lyricsLines = [];
            const lyricsMap = []; // 存储歌词行在原始utterances中的索引

            captionsData.utterances.forEach((utterance, originalIndex) => {
                const text = utterance.text || '';
                // 过滤掉方括号中的音乐标记
                if (text && !text.match(/^\[.*\]$/)) {
                    lyricsLines.push({
                        text: text,
                        startTime: utterance.start_time || utterance.startTime,
                        endTime: utterance.end_time || utterance.endTime,
                        originalIndex: originalIndex
                    });
                }
            });

            // 生成歌词HTML，使用原始索引
            let lyricsHtml = '';
            lyricsLines.forEach((line, index) => {
                if (line.text.trim()) {
                    lyricsHtml += `<div class="lyric-line" data-original-index="${line.originalIndex}" data-start-time="${line.startTime}" data-end-time="${line.endTime}" style="
                        padding: 6px 12px;
                        margin: 3px 0;
                        border-radius: 6px;
                        transition: all 0.3s ease;
                        cursor: default;
                        text-align: center;
                        font-size: 0.95rem;
                        opacity: 0.6;
                    ">${line.text}</div>`;
                }
            });

            if (lyricsHtml) {
                lyricsContent.innerHTML = lyricsHtml;

                // 存储歌词到全局变量，供复制功能使用
                window.currentLyrics = lyricsLines.map(line => line.text).join('\n');

                // 添加歌词高亮功能
                const audioElement = document.getElementById('music-audio-element');
                if (audioElement && captionsData.duration) {
                    setupLyricsSync(audioElement, lyricsLines);
                }
            } else {
                lyricsContent.innerHTML = '<div style="text-align: center; opacity: 0.7;">暂无歌词</div>';
                window.currentLyrics = '';
            }
        } else {
            const lyricsContent = document.getElementById('lyrics-content');
            if (lyricsContent) {
                lyricsContent.innerHTML = '<div style="text-align: center; opacity: 0.7;">暂无歌词</div>';
            }
        }
    } catch (error) {
        console.error('解析歌词数据失败:', error);
        const lyricsContent = document.getElementById('lyrics-content');
        if (lyricsContent) {
            lyricsContent.innerHTML = '<div style="text-align: center; opacity: 0.7;">歌词解析失败</div>';
        }
    }
}

// 设置歌词同步功能
function setupLyricsSync(audioElement, lyricsLines) {
    if (!audioElement || !lyricsLines || lyricsLines.length === 0) return;

    // 监听音频播放事件
    audioElement.addEventListener('timeupdate', function() {
        const currentTime = this.currentTime * 1000; // 转换为毫秒

        // 找到当前应该高亮的歌词
        let activeIndex = -1;
        for (let i = lyricsLines.length - 1; i >= 0; i--) {
            const lyric = lyricsLines[i];
            if (lyric.startTime <= currentTime && currentTime <= lyric.endTime) {
                activeIndex = i;
                break;
            }
        }

        // 更新歌词高亮
        const lyricLines_dom = document.querySelectorAll('.lyric-line');
        lyricLines_dom.forEach((line, index) => {
            if (index === activeIndex) {
                line.style.background = 'rgba(76, 175, 80, 0.3)';
                line.style.color = '#4caf50';
                line.style.transform = 'scale(1.02)';
                line.style.opacity = '1';

                // 滚动到当前歌词，居中显示
                const lyricsScroll = document.getElementById('lyrics-scroll');
                if (lyricsScroll) {
                    const scrollPosition = line.offsetTop - lyricsScroll.offsetTop - (lyricsScroll.offsetHeight / 2) + (line.offsetHeight / 2);

                    lyricsScroll.scrollTo({
                        top: scrollPosition,
                        behavior: 'smooth'
                    });
                }
            } else {
                line.style.background = 'transparent';
                line.style.color = 'white';
                line.style.transform = 'scale(1)';
                line.style.opacity = '0.6';
            }
        });
    });

    // 音频结束时清除高亮
    audioElement.addEventListener('ended', function() {
        const lyricLines_dom = document.querySelectorAll('.lyric-line');
        lyricLines_dom.forEach(line => {
            line.style.background = 'transparent';
            line.style.color = 'white';
            line.style.transform = 'scale(1)';
            line.style.opacity = '0.6';
        });
    });
}

// 复制歌词函数
function copyLyrics() {
    const lyricsText = window.currentLyrics || '';

    if (!lyricsText.trim()) {
        // 显示提示信息
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff9800;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            z-index: 10001;
            font-size: 1rem;
            animation: fadeInScale 0.4s ease-out;
        `;
        toast.textContent = '⚠️ 没有可复制的歌词';
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOutScale 0.3s ease-out';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 2000);
        return;
    }

    // 优先尝试使用降级方案，因为更稳定
    const textArea = document.createElement('textarea');
    textArea.value = lyricsText;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.readOnly = true;
    document.body.appendChild(textArea);

    textArea.select();
    textArea.setSelectionRange(0, 999999);

    try {
        const copySuccess = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (copySuccess) {
            // 显示复制成功提示
            const toast = document.createElement('div');
            toast.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #4caf50;
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 8px;
                z-index: 10001;
                font-size: 1rem;
                animation: fadeInScale 0.4s ease-out;
            `;
            toast.textContent = '📝 歌词已复制到剪贴板';
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = 'fadeOutScale 0.3s ease-out';
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 2000);
        } else {
            throw new Error('execCommand failed');
        }
    } catch (err) {
        console.error('降级复制失败:', err);

        // 尝试使用现代 Clipboard API（如果可用）
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(lyricsText).then(() => {
                // 显示复制成功提示
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #4caf50;
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    z-index: 10001;
                    font-size: 1rem;
                    animation: fadeInScale 0.4s ease-out;
                `;
                toast.textContent = '📝 歌词已复制到剪贴板';
                document.body.appendChild(toast);

                setTimeout(() => {
                    toast.style.animation = 'fadeOutScale 0.3s ease-out';
                    setTimeout(() => {
                        toast.remove();
                    }, 300);
                }, 2000);
            }).catch(clipboardErr => {
                console.error('Clipboard API 也失败:', clipboardErr);
                showCopyErrorMessage(lyricsText);
            });
        } else {
            showCopyErrorMessage(lyricsText);
        }
    }
}

// 显示复制错误信息和手动复制选项
function showCopyErrorMessage(lyricsText) {
    // 创建错误提示对话框
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        color: #333;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10002;
        font-size: 1rem;
        max-width: 80%;
        max-height: 70%;
        overflow-y: auto;
        animation: fadeInScale 0.4s ease-out;
    `;

    dialog.innerHTML = `
        <h3 style="margin-top: 0; color: #ff5722;">❌ 复制失败</h3>
        <p style="margin-bottom: 1rem;">自动复制不可用，请手动选择以下歌词进行复制：</p>
        <textarea readonly style="
            width: 100%;
            height: 200px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-family: inherit;
            font-size: 14px;
            line-height: 1.6;
            resize: vertical;
        " onclick="this.select(); this.setSelectionRange(0, 999999);">${lyricsText}</textarea>
        <div style="margin-top: 1rem; text-align: center;">
            <button onclick="this.parentElement.parentElement.remove();" style="
                background: #4caf50;
                color: white;
                border: none;
                padding: 0.8rem 2rem;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                margin-right: 1rem;
            ">关闭</button>
        </div>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666; font-style: italic;">
            提示：点击文本区域会自动选中全部歌词，然后按 Ctrl+C (Windows) 或 Cmd+C (Mac) 复制
        </p>
    `;

    document.body.appendChild(dialog);

    // 点击背景关闭对话框
    dialog.addEventListener('click', function(e) {
        if (e.target === dialog) {
            dialog.remove();
        }
    });

    // 自动选中文本
    const textarea = dialog.querySelector('textarea');
    if (textarea) {
        setTimeout(() => {
            textarea.focus();
            textarea.select();
            textarea.setSelectionRange(0, 999999);
        }, 100);
    }
}

// 修复音频播放功能 - 直接使用fetch获取音频数据绕过Referer检查
async function loadAudioWithHeaders(originalUrl) {
    try {
        showLoading();
        const errorMessage = document.getElementById('audio-error-message');
        const audioElement = document.getElementById('music-audio-element');

        console.log('尝试直接获取音频数据:', originalUrl);

        // 使用fetch直接获取音频数据，绕过audio标签的Referer限制
        const response = await fetch(originalUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'audio/webm,audio/ogg,audio/wav,audio/mp3,audio/mpeg,*/*;q=0.9',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Range': 'bytes=0-5000000' // 先获取前5MB
            },
            mode: 'cors',
            credentials: 'omit'
        });

        console.log('响应状态:', response.status, response.statusText);

        if (response.ok) {
            // 将响应转换为blob
            const audioBlob = await response.blob();
            console.log('音频Blob大小:', audioBlob.size, '类型:', audioBlob.type);

            const blobUrl = URL.createObjectURL(audioBlob);
            console.log('创建的Blob URL:', blobUrl);

            // 更新音频元素
            if (audioElement) {
                // 停止当前播放
                audioElement.pause();
                audioElement.currentTime = 0;

                // 创建新的source元素，使用blob URL
                const newSource = document.createElement('source');
                newSource.src = blobUrl;
                newSource.type = audioBlob.type || 'audio/mpeg';

                // 替换所有source元素
                audioElement.innerHTML = '';
                audioElement.appendChild(newSource);

                // 重新加载音频
                audioElement.load();

                // 尝试自动播放（某些浏览器可能需要用户交互）
                audioElement.play().catch(e => {
                    console.log('自动播放失败，需要用户手动点击播放:', e);
                });

                // 隐藏错误消息
                if (errorMessage) {
                    errorMessage.style.display = 'none';
                }

                // 显示成功提示
                const toast = document.createElement('div');
                toast.style.cssText = `
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: #4caf50;
                    color: white;
                    padding: 1rem 1.5rem;
                    border-radius: 8px;
                    z-index: 10001;
                    font-size: 1rem;
                `;
                toast.textContent = '🎵 播放问题已修复！音频已加载';
                document.body.appendChild(toast);

                setTimeout(() => {
                    toast.remove();
                }, 3000);
            }
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('直接获取音频失败:', error);

        // 尝试备选方案：创建隐藏的iframe来"清洁"Referer
        try {
            await loadAudioViaIframe(originalUrl);
        } catch (iframeError) {
            console.error('iframe方案也失败:', iframeError);
            alert('音频播放修复失败，请直接下载音乐文件');
        }
    } finally {
        hideLoading();
    }
}

// 备选方案：使用iframe绕过Referer检查
async function loadAudioViaIframe(originalUrl) {
    return new Promise((resolve, reject) => {
        console.log('尝试iframe方案:', originalUrl);

        // 创建隐藏的iframe
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'about:blank';

        document.body.appendChild(iframe);

        // 在iframe中加载音频
        iframe.onload = function() {
            try {
                const audioElement = document.getElementById('music-audio-element');
                if (audioElement && iframe.contentWindow) {
                    // 在iframe上下文中创建audio元素
                    const iframeAudio = iframe.contentWindow.document.createElement('audio');
                    iframeAudio.src = originalUrl;
                    iframeAudio.preload = 'auto';

                    iframeAudio.addEventListener('canplay', () => {
                        console.log('iframe中的音频可以播放');
                        // 复制到主音频元素
                        audioElement.src = originalUrl;
                        audioElement.load();

                        // 清理iframe
                        document.body.removeChild(iframe);
                        resolve();
                    });

                    iframeAudio.addEventListener('error', (e) => {
                        console.error('iframe中的音频加载失败:', e);
                        document.body.removeChild(iframe);
                        reject(e);
                    });

                    // 开始加载
                    iframeAudio.load();
                }
            } catch (e) {
                console.error('iframe操作失败:', e);
                document.body.removeChild(iframe);
                reject(e);
            }
        };

        // 开始加载iframe
        setTimeout(() => {
            if (iframe.parentNode) {
                document.body.removeChild(iframe);
            }
            reject(new Error('iframe加载超时'));
        }, 10000);
    });
}

// 高级修复：使用Service Worker或Web Worker获取音频
async function advancedAudioFix(originalUrl) {
    try {
        console.log('尝试高级音频修复方案');

        // 创建Web Worker来获取音频
        const workerCode = `
            self.addEventListener('message', async function(e) {
                const { url } = e.data;
                try {
                    const response = await fetch(url, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; AudioPlayer/1.0)',
                            'Accept': 'audio/*',
                            'Referer': 'https://www.douyin.com/'
                        }
                    });

                    if (response.ok) {
                        const blob = await response.blob();
                        const arrayBuffer = await blob.arrayBuffer();
                        self.postMessage({
                            success: true,
                            data: arrayBuffer,
                            type: blob.type
                        });
                    } else {
                        self.postMessage({ success: false, error: response.statusText });
                    }
                } catch (error) {
                    self.postMessage({ success: false, error: error.message });
                }
            });
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));

        return new Promise((resolve, reject) => {
            worker.onmessage = function(e) {
                const { success, data, type, error } = e.data;
                worker.terminate();

                if (success) {
                    const blob = new Blob([data], { type: type || 'audio/mpeg' });
                    const blobUrl = URL.createObjectURL(blob);
                    resolve(blobUrl);
                } else {
                    reject(new Error(error));
                }
            };

            worker.postMessage({ url: originalUrl });
        });

    } catch (error) {
        console.error('高级修复失败:', error);
        throw error;
    }
}

// 党史情景生成
async function generateHistoryScenario() {
    const event = document.getElementById('history-event').value.trim();

    if (!event) {
        alert('请输入历史事件');
        return;
    }

    showLoading();
    currentAgent = 'history';

    try {
        const response = await fetch(baseURL + '/api/history/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event: event
            })
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            const formattedContent = formatResult(data.scenario, 'history');
            showResult(`"${event}"情景描述`, formattedContent);
        } else {
            alert('生成失败：' + (data.error || '未知错误'));
        }

    } catch (error) {
        hideLoading();
        console.error('生成历史情景错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 绘声绘色政策解读
async function generatePolicyVisual() {
    const text = document.getElementById('policy-text').value.trim();
    const format = document.getElementById('policy-format').value;

    if (!text) {
        alert('请输入政策文本');
        return;
    }

    showLoading();
    currentAgent = 'policy-visual';

    try {
        const response = await fetch(baseURL + '/api/policy-visual/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                format: format
            })
        });

        const data = await response.json();
        hideLoading();

        if (data.success) {
            const formattedContent = formatResult(data.content, 'policy-visual');
            const formatNames = {
                'h5': 'H5图文海报',
                'video': '1分钟短视频脚本',
                'quiz': '互动测试题'
            };
            showResult(`政策解读 - ${formatNames[format]}`, formattedContent);
        } else {
            alert('生成失败：' + (data.error || '未知错误'));
        }

    } catch (error) {
        hideLoading();
        console.error('生成政策解读错误:', error);
        alert('网络错误，请稍后重试');
    }
}

// 工具函数：防止重复点击
function preventDuplicateClick(button) {
    if (button.disabled) return;

    button.disabled = true;
    const originalText = button.textContent;

    // 3秒后恢复按钮
    setTimeout(() => {
        button.disabled = false;
        button.textContent = originalText;
    }, 3000);

    return true;
}

// 错误处理
window.addEventListener('error', function(e) {
    console.error('全局错误:', e.error);
    hideLoading();
});

// 为所有生成按钮添加防重复点击
document.addEventListener('DOMContentLoaded', function() {
    const generateButtons = document.querySelectorAll('.generate-btn');
    generateButtons.forEach(button => {
        button.addEventListener('click', function() {
            preventDuplicateClick(this);
        });
    });
});