// 智慧思政智能体平台 JavaScript 功能

// 全局变量
let currentAgent = null;
let isModalOpen = false;

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('智慧思政智能体平台已加载');

    // 加载智能体模板
    loadAgentTemplates();

    // 为所有输入框添加回车键监听
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            if (e.target.id === 'policy-input') {
                sendPolicyMessage();
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

// 政策智能问答功能
async function sendPolicyMessage() {
    const input = document.getElementById('policy-input');
    const messages = document.getElementById('policy-chat-messages');
    const message = input.value.trim();

    if (!message) return;

    // 添加用户消息
    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    userMessage.textContent = message;
    messages.appendChild(userMessage);

    // 清空输入框
    input.value = '';

    // 显示思考中的消息
    const thinkingMessage = document.createElement('div');
    thinkingMessage.className = 'message bot';
    thinkingMessage.textContent = '正在思考中...';
    messages.appendChild(thinkingMessage);

    // 滚动到底部
    messages.scrollTop = messages.scrollHeight;

    try {
        // 模拟API调用（这里需要根据实际后端接口调整）
        const response = await fetch('/api/policy/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();

        // 移除思考中的消息
        messages.removeChild(thinkingMessage);

        // 添加机器人回复
        const botMessage = document.createElement('div');
        botMessage.className = 'message bot';
        botMessage.textContent = data.response || '抱歉，我暂时无法回答这个问题。';
        messages.appendChild(botMessage);

    } catch (error) {
        console.error('政策问答错误:', error);

        // 移除思考中的消息
        messages.removeChild(thinkingMessage);

        // 添加错误消息
        const errorMessage = document.createElement('div');
        errorMessage.className = 'message bot';
        errorMessage.textContent = '抱歉，网络连接出现问题，请稍后重试。';
        messages.appendChild(errorMessage);
    }

    // 滚动到底部
    messages.scrollTop = messages.scrollHeight;
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
        const response = await fetch('/api/organization/generate', {
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
        const response = await fetch('/api/immersive/generate', {
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
        const response = await fetch('/music/prompt_generate');
        const data = await response.json();

        if (data.prompt) {
            promptDiv.textContent = data.prompt;
            promptDiv.classList.add('show');

            // 将生成的提示词填入关键词输入框
            document.getElementById('music-keyword').value = data.prompt;
        } else {
            alert('生成提示词失败');
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
        const response = await fetch('/music/generate', {
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

        if (data.music_url) {
            const content = `
                <p><strong>生成提示词：</strong>${prompt}</p>
                <p><strong>音乐参数：</strong></p>
                <ul>
                    <li>性别：${gender || '默认'}</li>
                    <li>风格：${genre || '默认'}</li>
                    <li>情绪：${mood || '默认'}</li>
                </ul>
                <div class="music-player">
                    <h4>生成的音乐</h4>
                    <audio controls style="width: 100%;">
                        <source src="${data.music_url}" type="audio/mpeg">
                        您的浏览器不支持音频播放。
                    </audio>
                    <p><a href="${data.music_url}" target="_blank" download>下载音乐文件</a></p>
                </div>
            `;
            showResult('音乐生成结果', content);
        } else {
            alert('生成失败：' + (data.error || '未知错误'));
        }

    } catch (error) {
        hideLoading();
        console.error('生成音乐错误:', error);
        alert('网络错误，请稍后重试');
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
        const response = await fetch('/api/history/generate', {
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
        const response = await fetch('/api/policy-visual/generate', {
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