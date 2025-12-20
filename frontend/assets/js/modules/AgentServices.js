/**
 * 智能体服务类
 */
import { CONSTANTS } from '../utils/constants.js';
import { showToast } from '../utils/helpers.js';

export class AgentServices {
    constructor() {
        this.baseURL = CONSTANTS.API_BASE_URL;
    }

    /**
     * 政策智能问答
     * @param {string} message - 用户消息
     * @param {Array} contextMessages - 上下文消息
     * @param {Function} onMessage - 消息回调函数
     * @param {Function} onError - 错误回调函数
     */
    async sendPolicyMessage(message, contextMessages, onMessage, onError) {
        try {
            const response = await fetch(this.baseURL + '/policy_agent/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_input: message,
                    context_messages: contextMessages
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            // 处理流式数据
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;

                    if (line.startsWith('data: ')) {
                        const data = line.slice(6).trim();

                        if (data === '[DONE]') {
                            onMessage({ done: true });
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.content || parsed.choices?.[0]?.delta?.content || '';
                            if (content) {
                                onMessage({ content, done: false });
                            }
                        } catch (e) {
                            if (data) {
                                onMessage({ content: data, done: false });
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
                                onMessage({ content, done: false });
                            }
                        } catch (e) {
                            if (data) {
                                onMessage({ content: data, done: false });
                            }
                        }
                    }
                }
            }

            onMessage({ done: true });
        } catch (error) {
            console.error('政策问答错误:', error);
            onError(error);
        }
    }

    /**
     * 生成组织生活方案
     * @param {Object} params - 参数对象
     * @returns {Promise} 生成结果
     */
    async generateOrgPlan(params) {
        try {
            const response = await fetch(this.baseURL + '/api/organization/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('生成组织生活方案错误:', error);
            throw error;
        }
    }

    /**
     * 生成沉浸式方案
     * @param {Object} params - 参数对象
     * @returns {Promise} 生成结果
     */
    async generateImmersivePlan(params) {
        try {
            const response = await fetch(this.baseURL + '/api/immersive/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('生成沉浸式方案错误:', error);
            throw error;
        }
    }

    /**
     * 生成音乐提示词
     * @returns {Promise} 提示词结果
     */
    async generateMusicPrompt() {
        try {
            const response = await fetch(this.baseURL + '/music/prompt_generate');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('生成音乐提示词错误:', error);
            throw error;
        }
    }

    /**
     * 生成音乐
     * @param {Object} params - 参数对象
     * @returns {Promise} 音乐生成结果
     */
    async generateMusic(params) {
        try {
            const response = await fetch(this.baseURL + '/music/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('生成音乐错误:', error);
            throw error;
        }
    }

    /**
     * 生成历史情景
     * @param {Object} params - 参数对象
     * @returns {Promise} 历史情景结果
     */
    async generateHistoryScenario(params) {
        try {
            const response = await fetch(this.baseURL + '/api/history/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('生成历史情景错误:', error);
            throw error;
        }
    }

    /**
     * 生成政策解读
     * @param {Object} params - 参数对象
     * @returns {Promise} 政策解读结果
     */
    async generatePolicyVisual(params) {
        try {
            const response = await fetch(this.baseURL + '/api/policy-visual/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('生成政策解读错误:', error);
            throw error;
        }
    }
}