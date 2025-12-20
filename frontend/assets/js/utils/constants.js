// 常量定义
export const CONSTANTS = {
    // API配置
    API_BASE_URL: '', // 基础URL，根据部署环境配置

    // 智能体类型映射
    AGENT_TYPES: {
        POLICY: 'policy',
        ORGANIZATION: 'organization',
        IMMERSIVE: 'immersive',
        MUSIC: 'music',
        HISTORY: 'history',
        POLICY_VISUAL: 'policy-visual'
    },

    // 智能体标题映射
    AGENT_TITLES: {
        'policy': '政策智能问答',
        'organization': '常规组织生活设计',
        'immersive': '沉浸式组织生活设计',
        'music': '音乐智能体',
        'history': '党史情景生成',
        'policy-visual': '绘声绘色政策解读'
    },

    // 音乐类型映射
    MUSIC_MAPPINGS: {
        gender: {
            'Male': '男声',
            'Female': '女声'
        },
        genre: {
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
        },
        mood: {
            'Happy': '欢快',
            'Dynamic/Energetic': '活力/激昂',
            'Sentimental/Melancholic/Lonely': '感性/忧郁/孤独',
            'Inspirational/Hopeful': '励志/希望',
            'Nostalgic/Memory': '怀旧/回忆',
            'Excited': '兴奋',
            'Sorrow/Sad': '悲伤',
            'Chill': '轻松',
            'Romantic': '浪漫'
        }
    },

    // 政策解读格式映射
    POLICY_FORMAT_NAMES: {
        'h5': 'H5图文海报',
        'video': '1分钟短视频脚本',
        'quiz': '互动测试题'
    },

    // 滚动阈值
    SCROLL_THRESHOLD: 100,

    // 防重复点击时间（毫秒）
    DEBOUNCE_TIME: 3000
};