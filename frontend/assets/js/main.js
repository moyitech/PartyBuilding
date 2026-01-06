/**
 * 智慧思政智能体平台 - 主入口文件
 */

// 导入模块
import { ComponentLoader } from './modules/ComponentLoader.js';
import { ModalManager } from './modules/ModalManager.js';
import { LoadingManager } from './modules/LoadingManager.js';
import { AgentServices } from './modules/AgentServices.js';
import { Formatter } from './modules/Formatter.js';
import { CONSTANTS } from './utils/constants.js';
import { showToast, preventDuplicateClick, adjustTextareaHeight, parseMarkdown } from './utils/helpers.js';

/**
 * 应用主类
 */
class SmartIdeologyApp {
    constructor() {
        this.componentLoader = new ComponentLoader();
        this.modalManager = new ModalManager();
        this.loadingManager = new LoadingManager();
        this.agentServices = new AgentServices();
        this.isInitialized = false;
    }

    /**
     * 初始化应用
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // 注册组件
            this.registerComponents();

            // 加载所有组件
            await this.componentLoader.loadAllComponents();

            // 初始化事件监听
            this.initEventListeners();

            // 加载智能体模板
            await this.loadAgentTemplates();

            this.isInitialized = true;
            console.log('智慧思政智能体平台已加载');

        } catch (error) {
            console.error('应用初始化失败:', error);
            showToast('应用初始化失败，请刷新页面重试', 'error');
        }
    }

    /**
     * 注册组件
     */
    registerComponents() {
        this.componentLoader.register('header', 'header.html');
        this.componentLoader.register('intro', 'intro-section.html');
        this.componentLoader.register('features', 'features.html');
        this.componentLoader.register('agents', 'agents-showcase.html', () => {
            this.initAgentCards();
        });
        this.componentLoader.register('usage', 'usage-section.html');
        this.componentLoader.register('modal', 'modal.html');
        this.componentLoader.register('footer', 'footer.html');
    }

    /**
     * 初始化事件监听
     */
    initEventListeners() {
        // 全局回车键监听
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (e.target.id === 'policy-input') {
                    if (!e.shiftKey) {
                        e.preventDefault();
                        this.sendPolicyMessage();
                    }
                } else if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    const form = e.target.closest('.agent-form');
                    const generateBtn = form?.querySelector('.generate-btn');
                    if (generateBtn && !generateBtn.disabled) {
                        generateBtn.click();
                    }
                }
            }
        });

        // 自动调整文本域高度
        document.addEventListener('input', (e) => {
            if (e.target.id === 'policy-input' || e.target.classList.contains('chat-textarea')) {
                adjustTextareaHeight(e.target);
            }
        });

        // 全局错误处理
        window.addEventListener('error', (e) => {
            console.error('全局错误:', e.error);
            this.loadingManager.hide();
        });
    }

    /**
     * 初始化智能体卡片
     */
    initAgentCards() {
        // 为智能体卡片添加点击效果
        const cards = document.querySelectorAll('.agent-showcase-card');
        cards.forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.classList.contains('open-agent-btn')) {
                    const btn = card.querySelector('.open-agent-btn');
                    if (btn) btn.click();
                }
            });
        });
    }

    /**
     * 加载智能体模板
     */
    async loadAgentTemplates() {
        try {
            const response = await fetch('agent-templates.html');
            const templateHtml = await response.text();

            // 创建临时div来解析模板
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = templateHtml;

            // 将模板添加到隐藏容器中
            const templatesContainer = document.getElementById('agent-templates');
            while (tempDiv.firstChild) {
                templatesContainer.appendChild(tempDiv.firstChild);
            }
        } catch (error) {
            console.error('加载智能体模板失败:', error);
        }
    }

    /**
     * 打开智能体弹窗（全局函数）
     */
    openAgent(agentType) {
        return this.modalManager.openAgent(agentType);
    }

    /**
     * 关闭弹窗（全局函数）
     */
    closeModal() {
        return this.modalManager.closeModal();
    }

    /**
     * 显示结果（全局函数）
     */
    showResult(title, content, type) {
        const formattedContent = Formatter.formatResult(content, type);
        return this.modalManager.showResult(title, formattedContent);
    }

    /**
     * 关闭结果（全局函数）
     */
    closeResult() {
        return this.modalManager.closeResult();
    }

    /**
     * 政策智能问答
     */
    async sendPolicyMessage() {
        const input = document.getElementById('policy-input');
        const messages = document.getElementById('policy-chat-messages');
        const message = input.value.trim();

        if (!message) return;

        // 构建上下文
        const contextMessages = [];
        const messageElements = messages.querySelectorAll('.message');

        for (let i = 1; i < messageElements.length; i++) { // 跳过第一个消息（欢迎语）
            const msgElement = messageElements[i];
            const contentElement = msgElement.querySelector('.message-content');

            if (contentElement) {
                const content = contentElement.textContent || contentElement.innerText;
                const role = msgElement.classList.contains('user') ? 'user' : 'assistant';

                if (content && content.trim()) {
                    contextMessages.push({
                        role: role,
                        content: content.trim()
                    });
                }
            }
        }

        // 添加用户消息
        const userMessage = this.createMessage('user', message);
        messages.appendChild(userMessage);

        // 清空输入框
        input.value = '';
        adjustTextareaHeight(input);

        // 显示思考中的消息
        const thinkingMessage = this.createMessage('bot', '<span class="thinking-indicator">正在思考中<span class="thinking-dots">...</span></span>');
        messages.appendChild(thinkingMessage);

        // 滚动到底部
        messages.scrollTop = messages.scrollHeight;

        try {
            // 创建流式响应的消息容器
            const botMessageContainer = this.createMessage('bot', '', true);
            messages.insertBefore(botMessageContainer, thinkingMessage);
            messages.removeChild(thinkingMessage);

            // 智能滚动控制
            let userScrolledUp = false;
            let scrollTimeout;

            const handleUserScroll = () => {
                const isNearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight <= 150;
                userScrolledUp = !isNearBottom;

                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    userScrolledUp = false;
                }, 2000);
            };

            messages.addEventListener('scroll', handleUserScroll, { passive: true });

            let accumulatedText = '';

            // 发送请求
            await this.agentServices.sendPolicyMessage(
                message,
                contextMessages,
                ({ content, done }) => {
                    if (done) {
                        botMessageContainer.classList.remove('streaming');
                        messages.removeEventListener('scroll', handleUserScroll);
                        clearTimeout(scrollTimeout);
                    } else if (content) {
                        accumulatedText += content;
                        const messageContent = botMessageContainer.querySelector('.message-content');
                        if (messageContent) {
                            messageContent.innerHTML = parseMarkdown(accumulatedText);
                        }

                        // 智能滚动
                        setTimeout(() => {
                            if (!userScrolledUp) {
                                messages.scrollTop = messages.scrollHeight;
                            }
                        }, 10);
                    }
                },
                (error) => {
                    console.error('政策问答错误:', error);

                    // 移除错误消息
                    const streamingMessage = messages.querySelector('.message.streaming');
                    if (streamingMessage) {
                        streamingMessage.remove();
                    }

                    // 添加错误消息
                    messages.appendChild(this.createMessage('bot', '抱歉，网络连接出现问题，请稍后重试。', false, true));
                }
            );

        } catch (error) {
            console.error('政策问答错误:', error);

            // 移除思考中的消息
            const streamingMessage = messages.querySelector('.message.streaming');
            if (streamingMessage) {
                streamingMessage.remove();
            }
            if (thinkingMessage.parentNode) {
                messages.removeChild(thinkingMessage);
            }

            // 添加错误消息
            messages.appendChild(this.createMessage('bot', '抱歉，网络连接出现问题，请稍后重试。', false, true));
        }
    }

    /**
     * 创建消息元素
     * @param {string} type - 消息类型 (user/bot)
     * @param {string} content - 消息内容
     * @param {boolean} streaming - 是否为流式消息
     * @param {boolean} isError - 是否为错误消息
     * @returns {HTMLElement} 消息元素
     */
    createMessage(type, content, streaming = false, isError = false) {
        const message = document.createElement('div');
        message.className = `message ${type} ${streaming ? 'streaming' : ''} ${isError ? 'error' : ''}`;

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = content;
        message.appendChild(messageContent);

        return message;
    }

    /**
     * 常规组织生活设计
     */
    async generateOrgPlan() {
        const theme = document.getElementById('org-theme')?.value.trim();
        const minute = parseInt(document.getElementById('org-minute')?.value) || 60;
        const participant = document.getElementById('org-participant')?.value.trim();

  
        if (!theme || !participant) {
            showToast('请填写活动主题和参与对象', 'warning');
            return;
        }

        const button = document.querySelector('[onclick="generateOrgPlan()"]');
        if (!preventDuplicateClick(button)) return;

        // 显示结果区域（在弹窗内部）
        const resultSection = document.getElementById('org-plan-result');
        const resultContent = document.getElementById('org-plan-content');

        console.log('弹窗内部结果区域:', resultSection);
        console.log('弹窗内部结果内容:', resultContent);

        if (!resultSection || !resultContent) {
            console.error('无法找到弹窗内部结果显示区域元素');
            showToast('页面元素错误，请刷新重试', 'error');
            return;
        }

        // 显示结果区域
        resultSection.style.display = 'block';

        // 显示生成中状态
        resultContent.innerHTML = `
            <div class="activity-plan-result">
                <div class="streaming-content">
                    <div class="section-placeholder">
                        <h3>📚 学习资料</h3>
                        <div class="content-streaming">AI正在思考中<span class="thinking-dots">...</span></div>
                    </div>
                    <div class="section-placeholder">
                        <h3>💬 讨论议题</h3>
                        <div class="content-streaming">AI正在思考中<span class="thinking-dots">...</span></div>
                    </div>
                    <div class="section-placeholder">
                        <h3>📋 活动流程建议</h3>
                        <div class="content-streaming">AI正在思考中<span class="thinking-dots">...</span></div>
                    </div>
                </div>
            </div>
        `;

        try {
            await this.agentServices.generateOrgPlan(
                { theme, minute, participant },
                ({ result, done, updateInfo }) => {
                    if (done) {
                        // 生成完成，渲染最终结果
                        resultContent.innerHTML = `
                            <div class="activity-plan-result">
                                <div class="result-section">
                                    <h3>📚 学习资料</h3>
                                    <div class="study-materials">
                                        ${result.学习资料 && result.学习资料.length > 0
                                            ? result.学习资料.map((item, index) => `<div class="material-item">${index + 1}. ${item}</div>`).join('')
                                            : '<div class="no-content">暂无学习资料</div>'
                                        }
                                    </div>
                                </div>

                                <div class="result-section">
                                    <h3>💬 讨论议题</h3>
                                    <div class="discussion-topics">
                                        ${result.讨论议题 && result.讨论议题.length > 0
                                            ? result.讨论议题.map((topic, index) => `<div class="topic-item">${index + 1}. ${topic}</div>`).join('')
                                            : '<div class="no-content">暂无讨论议题</div>'
                                        }
                                    </div>
                                </div>

                                <div class="result-section">
                                    <h3>📋 活动流程建议</h3>
                                    <div class="activity-flow">
                                        ${result.活动流程建议
                                            ? `<div class="flow-content">${parseMarkdown(result.活动流程建议)}</div>`
                                            : '<div class="no-content">暂无活动流程建议</div>'
                                        }
                                    </div>
                                </div>
                            </div>
                        `;

                        showToast('✅ 组织生活方案生成完成！', 'success');
                    } else if (result && updateInfo) {
                        // 增量更新结果
                        const streamingContent = resultContent.querySelector('.streaming-content');
                        if (streamingContent) {
                            // 检查是否需要初始化流式内容
                            if (!streamingContent.querySelector('.materials-container')) {
                                streamingContent.innerHTML = `
                                    <div class="section-placeholder">
                                        <h4>📚 学习资料</h4>
                                        <div class="materials-container"></div>
                                        <div class="content-streaming">
                                            <span class="placeholder-text">AI正在思考中<span class="thinking-dots">...</span></span>
                                        </div>
                                    </div>
                                    <div class="section-placeholder">
                                        <h4>💬 讨论议题</h4>
                                        <div class="topics-container"></div>
                                        <div class="content-streaming">
                                            <span class="placeholder-text">AI正在思考中<span class="thinking-dots">...</span></span>
                                        </div>
                                    </div>
                                    <div class="section-placeholder">
                                        <h4>📋 活动流程建议</h4>
                                        <div class="flow-streaming-container">
                                            <div class="flow-content"></div>
                                        </div>
                                        <div class="content-streaming">
                                            <span class="placeholder-text">AI正在思考中<span class="thinking-dots">...</span></span>
                                        </div>
                                    </div>
                                `;
                            }

                            // 处理学习资料实时更新
                            if (updateInfo.学习资料) {
                                const materialsContainer = streamingContent.querySelector('.materials-container');
                                const contentStreaming = streamingContent.querySelector('.materials-container + .content-streaming');

                                if (updateInfo.学习资料.完整列表) {
                                    const items = updateInfo.学习资料.完整列表.filter(item => item && item.trim().length > 0);
                                    materialsContainer.innerHTML = items
                                        .map((item, index) => `<div class="material-item">${index + 1}. ${item}</div>`)
                                        .join('');
                                } else if (updateInfo.学习资料.新增项目 && updateInfo.学习资料.新增项目.length > 0) {
                                    updateInfo.学习资料.新增项目.forEach((item) => {
                                        if (item && item.trim().length > 0) {
                                            const itemElement = document.createElement('div');
                                            itemElement.className = 'material-item new-item';
                                            itemElement.textContent = `${materialsContainer.children.length + 1}. ${item}`;
                                            materialsContainer.appendChild(itemElement);

                                            setTimeout(() => {
                                                itemElement.classList.remove('new-item');
                                            }, 50);
                                        }
                                    });
                                }

                                if (materialsContainer.children.length > 0) {
                                    contentStreaming.style.display = 'none';
                                }
                            }

                            // 处理讨论议题实时更新
                            if (updateInfo.讨论议题) {
                                const topicsContainer = streamingContent.querySelector('.topics-container');
                                const contentStreaming = streamingContent.querySelector('.topics-container + .content-streaming');

                                if (updateInfo.讨论议题.完整列表) {
                                    const topics = updateInfo.讨论议题.完整列表.filter(topic => topic && topic.trim().length > 0);
                                    topicsContainer.innerHTML = topics
                                        .map((topic, index) => `<div class="topic-item">${index + 1}. ${topic}</div>`)
                                        .join('');
                                } else if (updateInfo.讨论议题.新增项目 && updateInfo.讨论议题.新增项目.length > 0) {
                                    updateInfo.讨论议题.新增项目.forEach((topic) => {
                                        if (topic && topic.trim().length > 0) {
                                            const topicElement = document.createElement('div');
                                            topicElement.className = 'topic-item new-item';
                                            topicElement.textContent = `${topicsContainer.children.length + 1}. ${topic}`;
                                            topicsContainer.appendChild(topicElement);

                                            setTimeout(() => {
                                                topicElement.classList.remove('new-item');
                                            }, 50);
                                        }
                                    });
                                }

                                if (topicsContainer.children.length > 0) {
                                    contentStreaming.style.display = 'none';
                                }
                            }

                            // 处理活动流程建议的流式更新
                            if (updateInfo.活动流程建议) {
                                const flowContent = streamingContent.querySelector('.flow-content');
                                const contentStreaming = streamingContent.querySelector('.flow-streaming-container + .content-streaming');

                                flowContent.innerHTML = parseMarkdown(updateInfo.活动流程建议.完整内容);
                                contentStreaming.style.display = 'none';
                            }
                        }
                    }
                },
                (error) => {
                    console.error('生成组织生活方案错误:', error);
                    resultContent.innerHTML = `
                        <div class="error-content">
                            <p>抱歉，生成组织生活方案时出现错误，请稍后重试。</p>
                            <p style="font-size: 0.9em; opacity: 0.8;">错误信息：${error.message || '网络连接失败'}</p>
                        </div>
                    `;
                    showToast('生成失败，请稍后重试', 'error');
                }
            );
        } catch (error) {
            console.error('生成组织生活方案错误:', error);
            resultContent.innerHTML = `
                <div class="error-content">
                    <p>抱歉，生成组织生活方案时出现错误，请稍后重试。</p>
                </div>
            `;
            showToast('网络错误，请稍后重试', 'error');
        }
    }

    /**
     * 沉浸式组织生活设计
     */
    async generateImmersivePlan() {
        const keyword = document.getElementById('immersive-keyword')?.value.trim();

        if (!keyword) {
            showToast('请输入关键词', 'warning');
            return;
        }

        const button = document.querySelector('[onclick="generateImmersivePlan()"]');
        if (!preventDuplicateClick(button)) return;

        this.loadingManager.show();

        try {
            const data = await this.agentServices.generateImmersivePlan({ keyword });

            if (data.success) {
                this.showResult('沉浸式组织生活方案', data.plan, 'immersive');
            } else {
                showToast('生成失败：' + (data.error || '未知错误'), 'error');
            }
        } catch (error) {
            console.error('生成沉浸式方案错误:', error);
            showToast('网络错误，请稍后重试', 'error');
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * 音乐智能体 - 生成提示词
     */
    async generateMusicPrompt() {
        const button = document.querySelector('[onclick="generateMusicPrompt()"]');

        // 手动检查重复点击，不使用 preventDuplicateClick 避免冲突
        if (button.disabled || button.getAttribute('data-loading') === 'true') return;

        // 保存原始按钮内容
        const originalContent = button.innerHTML;
        button.setAttribute('data-original-content', originalContent);

        // 设置加载状态标记
        button.setAttribute('data-loading', 'true');
        button.disabled = true;
        button.innerHTML = '<span class="btn-icon">⏳</span> AI正在生成中...';
        button.style.opacity = '0.7';

        // 添加加载动画
        const loadingIcon = button.querySelector('.btn-icon');
        if (loadingIcon) {
            loadingIcon.style.animation = 'spin 1s linear infinite';
        }

        try {
            const data = await this.agentServices.generateMusicPrompt();

            if (data.prompt) {
                // 自动填充到表单
                document.getElementById('music-keyword').value = data.prompt;

                if (data.gender) {
                    document.getElementById('music-gender').value = data.gender;
                }
                if (data.genre) {
                    document.getElementById('music-genre').value = data.genre;
                }
                if (data.mood) {
                    document.getElementById('music-mood').value = data.mood;
                }

                showToast('✅ AI提示词生成成功！', 'success');
            } else {
                showToast('⚠️ 生成提示词失败，请重试', 'error');
            }

        } catch (error) {
            console.error('生成音乐提示词错误:', error);
            showToast('❌ 网络错误，请稍后重试', 'error');
        } finally {
            // 恢复按钮状态
            button.disabled = false;
            button.removeAttribute('data-loading');
            button.innerHTML = button.getAttribute('data-original-content') || originalContent;
            button.removeAttribute('data-original-content');
            button.style.opacity = '1';

            // 移除加载动画
            const icon = button.querySelector('.btn-icon');
            if (icon) {
                icon.style.animation = '';
            }
        }
    }

    /**
     * 音乐智能体 - 生成音乐
     */
    async generateMusic() {
        const prompt = document.getElementById('music-keyword')?.value.trim();
        const gender = document.getElementById('music-gender')?.value;
        const genre = document.getElementById('music-genre')?.value;
        const mood = document.getElementById('music-mood')?.value;

        if (!prompt) {
            showToast('请输入关键词', 'warning');
            return;
        }

        const button = document.querySelector('[onclick="generateMusic()"]');

        // 手动检查重复点击，不使用 preventDuplicateClick 避免冲突
        if (button.disabled || button.getAttribute('data-loading') === 'true') return;

        // 保存原始按钮内容
        const originalContent = button.innerHTML;
        button.setAttribute('data-original-content', originalContent);

        // 设置加载状态标记
        button.setAttribute('data-loading', 'true');
        button.disabled = true;
        button.innerHTML = '<span class="btn-icon">🎵</span> AI正在创作中...';
        button.style.opacity = '0.7';

        // 添加加载动画
        const loadingIcon = button.querySelector('.btn-icon');
        if (loadingIcon) {
            loadingIcon.style.animation = 'spin 1s linear infinite';
        }

        // 显示全局加载遮罩
        this.loadingManager.show();

        try {
            const data = await this.agentServices.generateMusic({
                prompt,
                gender: gender || undefined,
                genre: genre || undefined,
                mood: mood || undefined
            });

            if (data.music_url) {
                // 显示音乐播放器
                this.displayMusicPlayer(data);
                showToast('🎵 AI音乐创作成功！', 'success');
            } else {
                showToast('⚠️ 音乐生成失败，请重试', 'error');
            }

        } catch (error) {
            console.error('生成音乐错误:', error);
            showToast('❌ 网络错误，请稍后重试', 'error');
        } finally {
            // 恢复按钮状态
            button.disabled = false;
            button.removeAttribute('data-loading');
            button.innerHTML = button.getAttribute('data-original-content') || originalContent;
            button.removeAttribute('data-original-content');
            button.style.opacity = '1';

            // 移除加载动画
            const icon = button.querySelector('.btn-icon');
            if (icon) {
                icon.style.animation = '';
            }

            // 隐藏全局加载遮罩
            this.loadingManager.hide();
        }
    }

    /**
     * 显示音乐播放器
     * @param {Object} data - 音乐数据
     */
    displayMusicPlayer(data) {
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
                            <!-- 第一行：播放按钮 -->
                            <div class="player-controls-row">
                                <button class="play-pause-btn" id="play-pause-btn">
                                    <span id="play-icon">▶</span>
                                </button>
                            </div>

                            <!-- 第二行：进度条 -->
                            <div class="player-controls-row">
                                <div class="audio-time" id="current-time">0:00</div>
                                <div class="audio-timeline" id="audio-timeline" style="flex: 1; margin: 0 15px;">
                                    <div class="audio-progress" id="audio-progress">
                                        <div class="audio-thumb" id="audio-thumb"></div>
                                    </div>
                                </div>
                                <div class="audio-time" id="duration">0:00</div>
                            </div>

                            <!-- 第三行：音量控制 -->
                            <div class="player-controls-row">
                                <div class="volume-control">
                                    <span class="volume-icon" id="volume-icon">🔊</span>
                                    <div class="volume-slider" id="volume-slider">
                                        <div class="volume-progress"></div>
                                        <div class="volume-thumb"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="audio-actions">
                            <a href="${data.music_url}" target="_blank" download>
                                📥 下载音乐
                            </a>
                            <button onclick="copyLyrics()">
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

            // 设置自定义播放器
            this.setupCustomAudioPlayer(data.music_url, data.audio_captions);
        }
    }

    /**
     * 设置自定义音频播放器
     * @param {string} audioUrl - 音频URL
     * @param {Object} audioCaptions - 歌词数据
     */
    setupCustomAudioPlayer(audioUrl, audioCaptions) {
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

        // 设置音频源
        audio.src = audioUrl;
        audio.preload = 'auto';

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
                // 将圆圈定位到进度条的准确位置：进度条宽度 - 圆圈半径
                thumb.style.left = (timeline.offsetWidth * progressPercent / 100 - 8) + 'px';
                currentTimeEl.textContent = formatTime(current);
            }
        });

        // 音频结束
        audio.addEventListener('ended', () => {
            playIcon.textContent = '▶';
            progress.style.width = '0%';
            thumb.style.left = '-8px';
            currentTimeEl.textContent = '0:00';
        });

        // 进度条点击跳转
        timeline.addEventListener('click', (e) => {
            const rect = timeline.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = Math.max(0, Math.min(1, clickX / rect.width));

            if (!isNaN(audio.duration)) {
                audio.currentTime = percent * audio.duration;
            }
        });

        // 拖动进度条
        function startDrag(e) {
            isDragging = true;
            audio.dataset.wasPlaying = !audio.paused;
            updateProgressFromMouse(e.touches ? e.touches[0] : e);
            e.preventDefault();
        }

        function drag(e) {
            if (isDragging) {
                updateProgressFromMouse(e.touches ? e.touches[0] : e);
                e.preventDefault();
            }
        }

        function endDrag(e) {
            if (isDragging) {
                isDragging = false;
                const rect = timeline.getBoundingClientRect();
                const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
                const mousePercent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                if (!isNaN(audio.duration)) {
                    audio.currentTime = mousePercent * audio.duration;
                }

                if (audio.dataset.wasPlaying === 'true') {
                    audio.play();
                }
                delete audio.dataset.wasPlaying;
            }
        }

        // 鼠标事件
        timeline.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', endDrag);

        // 触摸事件
        timeline.addEventListener('touchstart', startDrag, { passive: false });
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('touchend', endDrag);

        function updateProgressFromMouse(e) {
            const rect = timeline.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percent = Math.max(0, Math.min(1, clickX / rect.width));

            progress.style.width = (percent * 100) + '%';
            // 使用与播放时相同的定位计算方式
            thumb.style.left = (timeline.offsetWidth * percent - 8) + 'px';

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
                // 使用与进度条相同的定位方式：滑块宽度 * 百分比 - 圆圈半径
                volumeThumb.style.left = (volumeSlider.offsetWidth * volume - 6) + 'px';

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

        // 音频加载完成后显示播放器
        audio.addEventListener('canplay', () => {
            const loadingDiv = document.getElementById('loading-cache');
            const audioPlayerDiv = document.getElementById('audio-player');
            const cacheStatusDiv = document.getElementById('cache-status');

            if (loadingDiv) loadingDiv.style.display = 'none';
            if (audioPlayerDiv) audioPlayerDiv.style.display = 'block';
            if (cacheStatusDiv) {
                cacheStatusDiv.textContent = '💾 音频已缓存到服务器，可无限次播放';
                cacheStatusDiv.className = 'success';
            }

            // 处理和显示歌词
            if (audioCaptions) {
                this.displayLyrics(audioCaptions);
                const lyricsContainer = document.getElementById('lyrics-container');
                if (lyricsContainer) {
                    lyricsContainer.style.display = 'block';
                }
            }
        });

        // 音频加载错误处理
        audio.addEventListener('error', (e) => {
            const loadingDiv = document.getElementById('loading-cache');
            if (loadingDiv) {
                loadingDiv.innerHTML = `
                    <div style="color: #ff9800; font-size: 1.1rem;">⚠️ 音频加载失败</div>
                    <div style="font-size: 0.9rem; opacity: 0.8;">请尝试刷新页面或重新生成音乐</div>
                `;
            }
        });
    }

    /**
     * 显示歌词
     * @param {Object} audioCaptions - 歌词数据
     */
    displayLyrics(audioCaptions) {
        try {
            // 解析歌词数据
            const captionsData = typeof audioCaptions === 'string' ? JSON.parse(audioCaptions) : audioCaptions;

            if (captionsData.utterances && captionsData.utterances.length > 0) {
                const lyricsContent = document.getElementById('lyrics-content');
                if (!lyricsContent) return;

                // 过滤掉音乐标记，只保留歌词文本
                const lyricsLines = [];
                const lyricsMap = [];

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

                // 生成歌词HTML
                let lyricsHtml = '';
                lyricsLines.forEach((line, index) => {
                    if (line.text.trim()) {
                        lyricsHtml += `<div class="lyric-line" data-original-index="${line.originalIndex}" data-start-time="${line.startTime}" data-end-time="${line.endTime}">${line.text}</div>`;
                    }
                });

                if (lyricsHtml) {
                    lyricsContent.innerHTML = lyricsHtml;

                    // 存储歌词到全局变量，供复制功能使用
                    window.currentLyrics = lyricsLines.map(line => line.text).join('\n');

                    // 添加歌词高亮功能
                    const audioElement = document.getElementById('music-audio-element');
                    if (audioElement && captionsData.duration) {
                        this.setupLyricsSync(audioElement, lyricsLines);
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

    /**
     * 设置歌词同步功能
     * @param {HTMLElement} audioElement - 音频元素
     * @param {Array} lyricsLines - 歌词行数组
     */
    setupLyricsSync(audioElement, lyricsLines) {
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
                    line.classList.add('active');
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
                    line.classList.remove('active');
                }
            });
        });

        // 音频结束时清除高亮
        audioElement.addEventListener('ended', function() {
            const lyricLines_dom = document.querySelectorAll('.lyric-line');
            lyricLines_dom.forEach(line => {
                line.classList.remove('active');
            });
        });
    }

    /**
     * 党史情景生成
     */
    async generateHistoryScenario() {
        const event = document.getElementById('history-event')?.value.trim();

        if (!event) {
            showToast('请输入历史事件', 'warning');
            return;
        }

        const button = document.querySelector('[onclick="generateHistoryScenario()"]');
        if (!preventDuplicateClick(button)) return;

        this.loadingManager.show();

        try {
            const data = await this.agentServices.generateHistoryScenario({ event });

            if (data.success) {
                this.showResult(`"${event}"情景描述`, data.scenario, 'history');
            } else {
                showToast('生成失败：' + (data.error || '未知错误'), 'error');
            }

        } catch (error) {
            console.error('生成历史情景错误:', error);
            showToast('网络错误，请稍后重试', 'error');
        } finally {
            this.loadingManager.hide();
        }
    }

    /**
     * 绘声绘色政策解读
     */
    async generatePolicyVisual() {
        const text = document.getElementById('policy-text')?.value.trim();
        const format = document.getElementById('policy-format')?.value;

        if (!text) {
            showToast('请输入政策文本', 'warning');
            return;
        }

        const button = document.querySelector('[onclick="generatePolicyVisual()"]');
        if (!preventDuplicateClick(button)) return;

        this.loadingManager.show();

        try {
            const data = await this.agentServices.generatePolicyVisual({ text, format });

            if (data.success) {
                const formatNames = CONSTANTS.POLICY_FORMAT_NAMES;
                this.showResult(`政策解读 - ${formatNames[format]}`, data.content, 'policy-visual');
            } else {
                showToast('生成失败：' + (data.error || '未知错误'), 'error');
            }

        } catch (error) {
            console.error('生成政策解读错误:', error);
            showToast('网络错误，请稍后重试', 'error');
        } finally {
            this.loadingManager.hide();
        }
    }
}

// 创建全局应用实例
const app = new SmartIdeologyApp();

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// 将全局函数绑定到window对象，供HTML中的onclick调用
window.openAgent = (agentType) => app.openAgent(agentType);
window.closeModal = () => app.closeModal();
window.closeResult = () => app.closeResult();
window.sendPolicyMessage = () => app.sendPolicyMessage();
window.generateOrgPlan = () => app.generateOrgPlan();
window.generateImmersivePlan = () => app.generateImmersivePlan();
window.generateMusicPrompt = () => app.generateMusicPrompt();
window.generateMusic = () => app.generateMusic();
window.generateHistoryScenario = () => app.generateHistoryScenario();
window.generatePolicyVisual = () => app.generatePolicyVisual();
window.copyLyrics = () => {
    const lyricsText = window.currentLyrics || '';

    if (!lyricsText.trim()) {
        showToast('⚠️ 没有可复制的歌词', 'warning');
        return;
    }

    // 优先尝试使用现代 Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(lyricsText).then(() => {
            showToast('📝 歌词已复制到剪贴板', 'success');
        }).catch(() => {
            // 降级到传统方法
            fallbackCopyLyrics(lyricsText);
        });
    } else {
        // 降级到传统方法
        fallbackCopyLyrics(lyricsText);
    }
};

// 降级复制歌词方法
function fallbackCopyLyrics(lyricsText) {
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
            showToast('📝 歌词已复制到剪贴板', 'success');
        } else {
            showToast('复制失败，请手动选择复制', 'error');
        }
    } catch (err) {
        document.body.removeChild(textArea);
        showToast('复制失败，请手动选择复制', 'error');
    }
}

// 导出到模块作用域（如果需要）
export default app;
