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
     * 判断项目是否完整（是否应该弹入列表）
     * @param {string} item - 项目内容
     * @returns {boolean} 是否完整
     */
    isCompleteItem(item) {
        if (!item || item.trim().length === 0) return false;

        // 完整的项目通常具有以下特征：
        // 1. 以句号、书名号、引号等标点符号结束
        // 2. 长度适中（至少5个字符）
        // 3. 不是单个字符或标点符号
        const trimmed = item.trim();

        // 太短的项目不完整
        if (trimmed.length < 5) return false;

        // 检查结束标点
        const endChars = ['。', '》', '）', ')', '"', '！', '？', ']'];
        const lastChar = trimmed[trimmed.length - 1];
        const secondLastChar = trimmed.length > 1 ? trimmed[trimmed.length - 2] : '';

        // 以完整标点符号结束
        return endChars.includes(lastChar) ||
               // 书名号格式
               (trimmed.includes('《') && trimmed.includes('》')) ||
               // 包含常见的完整词汇
               trimmed.includes('出版社') ||
               trimmed.includes('编著') ||
               trimmed.includes('编');
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
     * @param {Function} onMessage - 消息回调函数
     * @param {Function} onError - 错误回调函数
     */
    async generateOrgPlan(params, onMessage, onError) {
        try {
            const response = await fetch(this.baseURL + '/activity_design', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let result = {
                学习资料: [],
                讨论议题: [],
                活动流程建议: ""
            };
            const finalizedMaterials = new Set();
            const finalizedTopics = new Set();
            let lastMaterialsLength = 0;
            let lastTopicsLength = 0;

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
                            onMessage({ result, done: true });
                            return;
                        }

                        try {
                            const parsed = JSON.parse(data);

                            // 更新结果对象，支持增量更新
                            let updated = false;
                            let updateInfo = {};

                            if (parsed.学习资料 && parsed.学习资料 !== result.学习资料) {
                                const materials = parsed.学习资料 || [];
                                const newLength = materials.length;
                                const newItems = [];

                                const finalize = (index) => {
                                    const item = materials[index];
                                    if (!item || item.trim().length === 0) return;
                                    if (finalizedMaterials.has(index)) return;
                                    finalizedMaterials.add(index);
                                    newItems.push(item);
                                };

                                result.学习资料 = materials;

                                if (newLength > lastMaterialsLength) {
                                    for (let i = 0; i < newLength - 1; i++) {
                                        finalize(i);
                                    }
                                }

                                if (newLength > 0 && this.isCompleteItem(materials[newLength - 1])) {
                                    finalize(newLength - 1);
                                }

                                lastMaterialsLength = newLength;

                                if (newItems.length > 0) {
                                    updated = true;
                                    updateInfo.学习资料 = {
                                        新增项目: newItems,
                                        总数: newLength
                                    };
                                }
                            }
                            if (parsed.讨论议题 && parsed.讨论议题 !== result.讨论议题) {
                                const topics = parsed.讨论议题 || [];
                                const newLength = topics.length;
                                const newItems = [];

                                const finalize = (index) => {
                                    const item = topics[index];
                                    if (!item || item.trim().length === 0) return;
                                    if (finalizedTopics.has(index)) return;
                                    finalizedTopics.add(index);
                                    newItems.push(item);
                                };

                                result.讨论议题 = topics;

                                if (newLength > lastTopicsLength) {
                                    for (let i = 0; i < newLength - 1; i++) {
                                        finalize(i);
                                    }
                                }

                                if (newLength > 0 && this.isCompleteItem(topics[newLength - 1])) {
                                    finalize(newLength - 1);
                                }

                                lastTopicsLength = newLength;

                                if (newItems.length > 0) {
                                    updated = true;
                                    updateInfo.讨论议题 = {
                                        新增项目: newItems,
                                        总数: newLength
                                    };
                                }
                            }
                            if (parsed.活动流程建议 && parsed.活动流程建议 !== result.活动流程建议) {
                                const oldContent = result.活动流程建议 || '';
                                result.活动流程建议 = parsed.活动流程建议;
                                updated = true;
                                updateInfo.活动流程建议 = {
                                    新增内容: parsed.活动流程建议.slice(oldContent.length),
                                    完整内容: parsed.活动流程建议
                                };
                            }

                            // 只有当数据实际更新时才发送消息
                            if (updated) {
                                onMessage({ result, done: false, updateInfo });
                            }
                        } catch (e) {
                            // 如果不是JSON，当作普通文本处理
                            if (data) {
                                onMessage({ content: data, result, done: false });
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
                            if (parsed.学习资料) result.学习资料 = parsed.学习资料;
                            if (parsed.讨论议题) result.讨论议题 = parsed.讨论议题;
                            if (parsed.活动流程建议) result.活动流程建议 = parsed.活动流程建议;
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }

            onMessage({ result, done: true });
        } catch (error) {
            console.error('生成组织生活方案错误:', error);
            onError(error);
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
