/**
 * 模态框管理器
 */
export class ModalManager {
    constructor() {
        this.currentAgent = null;
        this.isModalOpen = false;
        this.init();
    }

    /**
     * 初始化模态框
     */
    init() {
        // 点击弹窗外部关闭弹窗
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('agentModal');
            if (e.target === modal && this.isModalOpen) {
                this.closeModal();
            }
        });

        // ESC键关闭弹窗
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen) {
                this.closeModal();
            }
        });
    }

    /**
     * 打开智能体弹窗
     * @param {string} agentType - 智能体类型
     */
    async openAgent(agentType) {
        this.currentAgent = agentType;
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
        try {
            const response = await fetch('agent-templates.html');
            const templateHtml = await response.text();

            // 创建临时div来解析模板
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = templateHtml;

            // 查找对应的模板
            const template = tempDiv.querySelector(`#${agentType}-template`);
            if (template) {
                modalBody.innerHTML = template.innerHTML;
            } else {
                modalBody.innerHTML = '<p>正在加载智能体...</p>';
            }

            // 执行初始化（如果有的话）
            this.initAgentContent(agentType);
        } catch (error) {
            console.error('加载智能体模板失败:', error);
            modalBody.innerHTML = '<p>加载失败，请重试</p>';
        }

        // 显示弹窗
        modal.classList.add('show');
        this.isModalOpen = true;
        document.body.style.overflow = 'hidden';
    }

    /**
     * 关闭弹窗
     */
    closeModal() {
        const modal = document.getElementById('agentModal');
        modal.classList.remove('show');
        this.isModalOpen = false;
        document.body.style.overflow = '';

        // 清空弹窗内容
        setTimeout(() => {
            document.getElementById('modalBody').innerHTML = '';
        }, 300);
    }

    /**
     * 初始化智能体内容
     * @param {string} agentType - 智能体类型
     */
    initAgentContent(agentType) {
        switch (agentType) {
            case 'policy':
                this.initPolicyAgent();
                break;
            case 'music':
                this.initMusicAgent();
                break;
            // 其他智能体的初始化...
        }
    }

    /**
     * 初始化政策智能体
     */
    initPolicyAgent() {
        const policyInput = document.getElementById('policy-input');
        if (policyInput) {
            policyInput.addEventListener('input', (e) => {
                this.adjustTextareaHeight(e.target);
            });
        }
    }

    /**
     * 初始化音乐智能体
     */
    initMusicAgent() {
        // 音乐智能体的初始化逻辑
    }

    /**
     * 调整文本域高度
     * @param {HTMLTextAreaElement} textarea - 文本域元素
     */
    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    /**
     * 显示结果
     * @param {string} title - 结果标题
     * @param {string} content - 结果内容
     */
    showResult(title, content) {
        const resultSection = document.getElementById('result-section');
        const resultTitle = document.getElementById('result-title');
        const resultContent = document.getElementById('result-content');

        resultTitle.textContent = title;
        resultContent.innerHTML = content;
        resultSection.style.display = 'block';

        // 滚动到结果区域
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    /**
     * 关闭结果
     */
    closeResult() {
        document.getElementById('result-section').style.display = 'none';
    }
}