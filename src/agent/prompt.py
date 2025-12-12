from langchain_core.prompts import ChatPromptTemplate
from textwrap import dedent

music_generate_prompt_generate_prompt_template = ChatPromptTemplate.from_template(dedent("""
# Role
你是一位精通**中国主旋律音乐（红色音乐）**的资深制作人。

# Input
请随机选择一个党史/党建/思政等相关的正能量主题：

# Task
1. 构思一个具体的歌词主题。
2. 设计该主题对应的**专业中文**音乐风格、情绪和乐器描述（确保词汇具有画面感和专业性）。
3. 将所有信息填入用户指定的句式中。

# Output Format (请直接输出以下这段话，不要包含其他解释)
我想创作一首歌曲，AI 帮我写歌词关于<填入具体主题和歌词意境>。这首歌是<填入风格，如：史诗交响、进行曲、民族管弦>音乐风格，传达<填入情绪，如：庄严、激昂、深情赞颂>的情绪，使用<填入音色，如：铜管乐、男中音美声、混声大合唱>音色。""").strip())

music_generate_prompt_polish_prompt_template = ChatPromptTemplate.from_template(dedent("""
# Role
你是一位主旋律音乐提示词专家。

# User Input (原始需求)
{user_input}

# Task
1. 分析用户的原始需求，提取歌词主题。
2. 将用户描述的口语化风格转化为专业的**中文音乐术语**。
   - 转化示例：“很大气” -> “宏大交响叙事”
   - 转化示例：“感人” -> “深情钢琴与弦乐”
   - 转化示例：“有力量” -> “激昂进行曲节奏”
3. 按照指定格式输出。

# Output Format (请直接输出以下这段话，不要包含其他解释)
我想创作一首歌曲，AI 帮我写歌词关于<这里用中文描述优化后的歌词主题>。这首歌是<这里填入专业风格描述>音乐风格，传达<这里填入精准的情绪形容词>的情绪，使用<这里填入具体的乐器及人声类型>音色。
""").strip())
