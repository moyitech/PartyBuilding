/**
 * 结果格式化器
 */
import { parseMarkdown } from '../utils/helpers.js';

export class Formatter {
    /**
     * 格式化生成结果
     * @param {string|Object} content - 内容
     * @param {string} type - 类型
     * @returns {string} 格式化后的HTML
     */
    static formatResult(content, type) {
        switch (type) {
            case 'organization':
                return this.formatOrganizationPlan(content);
            case 'immersive':
                return this.formatImmersivePlan(content);
            case 'history':
                return this.formatHistoryScenario(content);
            case 'policy-visual':
                return this.formatPolicyVisual(content);
            default:
                return `<p>${content}</p>`;
        }
    }

    /**
     * 格式化组织生活方案
     * @param {string|Object} content - 内容
     * @returns {string} 格式化后的HTML
     */
    static formatOrganizationPlan(content) {
        let formatted = '';

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

    /**
     * 格式化沉浸式方案
     * @param {string|Object} content - 内容
     * @returns {string} 格式化后的HTML
     */
    static formatImmersivePlan(content) {
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

    /**
     * 格式化历史情景
     * @param {string|Object} content - 内容
     * @returns {string} 格式化后的HTML
     */
    static formatHistoryScenario(content) {
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

    /**
     * 格式化政策解读
     * @param {string|Object} content - 内容
     * @returns {string} 格式化后的HTML
     */
    static formatPolicyVisual(content) {
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
            formatted = `<div class="formatted-text">${parseMarkdown(content)}</div>`;
        }

        return formatted;
    }
}