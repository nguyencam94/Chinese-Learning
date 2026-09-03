import { Vocabulary } from '../types';

export const CHINESE_PUNCTUATION_REGEX = /[。，！？、；：“”（）《》【】…—.,!?;:"'() \s]/g;

export function cleanChinesePunctuation(text: string): string {
  return text.replace(CHINESE_PUNCTUATION_REGEX, '').trim();
}

/**
 * Built-in dictionary of common Chinese collocations, compound words, and phrases
 * (HSK 1-5 frequent expressions, greetings, time, locations, question words, grammar compounds).
 */
export const COMMON_CHINESE_WORDS_AND_PHRASES: string[] = [
  // 4-character idioms, set greetings, and fixed expressions
  '好久不见', '对不起', '没关系', '没问题', '不好意思', '身体健康', '万事如意', '生日快乐',
  '新年快乐', '恭喜发财', '马马虎虎', '不知不觉', '自由自在', '一模一样', '一路顺风', '旅途愉快',
  '工作顺利', '心想事成', '天天向上', '丰富多彩', '无论如何',

  // 3-character words & compounds (question words, locations, daily terms)
  '什么时候', '怎么样', '为什么', '洗手间', '卫生间', '图书馆', '火车站', '飞机场', '电影院',
  '办公室', '出租车', '公共汽车', '自行车', '地铁站', '电话号码', '电子邮件', '身份证', '普通话',
  '汉语水平', '做作业', '踢足球', '打篮球', '看电影', '听音乐', '喝咖啡', '喝牛奶', '吃早饭',
  '吃午饭', '吃晚饭', '开玩笑', '感兴趣', '有意思', '没什么', '差不多', '不知道', '算了吧',

  // Time words & dates
  '星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期天', '星期日', '礼拜天',
  '前天', '昨天', '今天', '明天', '后天', '大前天', '大后天',
  '去年', '今年', '明年', '前年', '后年',
  '上午', '中午', '下午', '晚上', '早上', '现在', '刚才', '以前', '以后',
  '有时', '常常', '经常', '已经', '正在', '马上', '立刻', '突然', '刚才', '一直', '平时',

  // Conjunctions & Prepositions & Adverbs
  '一边', '一起', '如果', '要是', '虽然', '但是', '可是', '因为', '所以', '不仅', '而且',
  '或者', '还是', '为了', '关于', '除了', '即使', '既然', '只要', '只有', '无论', '不管',
  '非常', '特别', '比较', '极了', '有点儿', '一点儿', '更加', '越来', '越好', '一定', '可能',

  // Pronouns & Demonstratives
  '大家', '我们', '你们', '他们', '她们', '它们', '自己', '别人',
  '这个', '那个', '这些', '那些', '这里', '那里', '哪里', '这么', '那么', '怎么', '什么', '哪个', '谁的',

  // Common Verbs & Actions (2 characters)
  '喜欢', '希望', '觉得', '认为', '打算', '准备', '开始', '决定', '练习', '复习', '预习', '完成',
  '认识', '介绍', '欢迎', '谢谢', '再见', '帮助', '照顾', '支持', '参加', '联系', '回答', '同意',
  '反对', '明白', '理解', '知道', '学习', '工作', '休息', '睡觉', '起床', '跑步', '散步', '旅游',
  '旅行', '发现', '注意', '选择', '离开', '遇到', '遇见', '迟到', '送给', '借给', '相信', '记得',
  '忘记', '担心', '放心', '解决', '影响', '保护', '提供', '要求', '建议', '商量', '讨论', '证明',

  // Common Nouns (2 characters)
  '老师', '学生', '同学', '朋友', '医生', '护士', '司机', '先生', '女士', '小姐', '孩子', '家人',
  '爸爸', '妈妈', '哥哥', '姐姐', '弟弟', '妹妹', '爷爷', '奶奶', '中文', '汉语', '英文', '英语',
  '学校', '大学', '医院', '银行', '超市', '商店', '饭馆', '宾馆', '机场', '车站', '公园', '教室',
  '房间', '天气', '衣服', '电脑', '手机', '桌子', '椅子', '铅笔', '书包', '东西', '礼物', '事情',

  // Common Adjectives (2 characters)
  '高兴', '快乐', '漂亮', '美丽', '舒服', '方便', '清楚', '着急', '难过', '热情', '努力', '认真',
  '聪明', '可爱', '安静', '干净', '新鲜', '精彩', '简单', '容易', '困难', '复杂', '便宜', '安全',
  '健康', '重要', '满意', '有名', '好吃', '好喝', '好看', '好玩',

  // Negative verb/auxiliary combinations
  '不是', '没有', '不要', '不用', '不能', '不会', '不想', '不去', '不好', '不行', '不必',

  // Common Measure Words with Numbers
  '一个', '一杯', '一件', '一本', '一张', '一条', '一块', '一点', '一些', '一次', '一天', '一年',
  '个月', '两个', '两杯', '两本', '两条', '两张', '三只', '四辆', '五位', '几次', '每个'
];

/**
 * Derives compound words from pinyin when available.
 * If pinyin has multi-syllable spaced words (e.g. "Wǒmen míngtiān qù túshūguǎn"),
 * this maps each multi-syllable word to the corresponding Chinese characters.
 */
export function extractWordsFromPinyin(cleanChinese: string, pinyin?: string): string[] {
  if (!pinyin || !cleanChinese) return [];
  const pinyinWords = pinyin.trim().split(/\s+/).filter(Boolean);
  const syllableRegex = /([bcdfghjklmnpqrstwxyz]*[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(?:ng|n|r)?)/gi;

  const extracted: string[] = [];
  let charIdx = 0;

  for (const pw of pinyinWords) {
    const cleanPw = pw.replace(/[.,!?;:"'()，。！？]/g, '');
    const matches = cleanPw.match(syllableRegex);
    const syllableCount = matches ? matches.length : 1;

    if (charIdx + syllableCount <= cleanChinese.length) {
      const phrase = cleanChinese.substring(charIdx, charIdx + syllableCount);
      if (phrase.length >= 2) {
        extracted.push(phrase);
      }
      charIdx += syllableCount;
    }
  }

  return extracted;
}

/**
 * Splits a Chinese sentence into meaningful segments/words.
 * 1. Collects candidates from user's vocabulary, common multi-character words/phrases,
 *    and pinyin syllable groupings.
 * 2. Uses Intl.Segmenter (standard browser Chinese word tokenization) where available.
 * 3. Prioritizes matching multi-character words and collocations first.
 * 4. Merges adjacent single characters that naturally form recognized compound words or
 *    number + classifier pairs, avoiding unnecessary fragmentation into single characters.
 */
export function segmentChineseSentence(
  chinese: string, 
  sentenceId?: string, 
  vocabList?: Vocabulary[],
  pinyin?: string
): string[] {
  const cleanText = cleanChinesePunctuation(chinese);
  if (!cleanText) return [];

  // Build candidate dictionary (longer phrases first)
  const candidateSet = new Set<string>();

  // 1. User vocabulary (associated with this sentence first, then all vocabulary words)
  if (vocabList && vocabList.length > 0) {
    for (const v of vocabList) {
      if (v.type === 'word' && v.word) {
        const w = v.word.trim();
        if (w.length >= 2 && cleanText.includes(w)) {
          candidateSet.add(w);
        }
      }
    }
  }

  // 2. Common dictionary phrases matching the current text
  for (const phrase of COMMON_CHINESE_WORDS_AND_PHRASES) {
    if (cleanText.includes(phrase)) {
      candidateSet.add(phrase);
    }
  }

  // 3. Pinyin-based compounds if available
  const pinyinCompounds = extractWordsFromPinyin(cleanText, pinyin);
  for (const pc of pinyinCompounds) {
    candidateSet.add(pc);
  }

  // Sort candidates by length descending so longer words/phrases match first
  const candidates = Array.from(candidateSet).sort((a, b) => b.length - a.length);

  // 4. Native ECMAScript Intl.Segmenter for Chinese words
  let intlWords: string[] = [];
  if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
    try {
      const seg = new (Intl as any).Segmenter('zh-Hans', { granularity: 'word' });
      intlWords = Array.from(seg.segment(cleanText))
        .map((s: any) => s.segment.trim())
        .filter(Boolean);
    } catch {
      try {
        const seg = new (Intl as any).Segmenter('zh', { granularity: 'word' });
        intlWords = Array.from(seg.segment(cleanText))
          .map((s: any) => s.segment.trim())
          .filter(Boolean);
      } catch {
        intlWords = [];
      }
    }
  }

  // 5. Tokenize from left to right prioritizing multi-character words
  const tokens: string[] = [];
  let i = 0;
  while (i < cleanText.length) {
    // Check custom candidates (longest first)
    let matched = false;
    for (const cand of candidates) {
      if (cleanText.startsWith(cand, i)) {
        tokens.push(cand);
        i += cand.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Check if Intl.Segmenter identified a multi-character word starting here
    let intlMatch: string | null = null;
    let pos = 0;
    for (const w of intlWords) {
      if (pos === i && w.length >= 2) {
        intlMatch = w;
        break;
      }
      pos += w.length;
    }

    if (intlMatch && cleanText.startsWith(intlMatch, i)) {
      tokens.push(intlMatch);
      i += intlMatch.length;
    } else {
      // Check surrogate pair or single character
      const codePoint = cleanText.codePointAt(i);
      if (codePoint && codePoint > 0xffff) {
        tokens.push(cleanText.substring(i, i + 2));
        i += 2;
      } else {
        tokens.push(cleanText[i]);
        i++;
      }
    }
  }

  // 6. Post-processing: smart merge for adjacent single characters that naturally form
  // a compound word (e.g. in intlWords, candidateSet, number + classifier, or common grammatical pairs)
  const merged: string[] = [];
  let j = 0;
  while (j < tokens.length) {
    if (j < tokens.length - 1 && tokens[j].length === 1 && tokens[j + 1].length === 1) {
      const pair = tokens[j] + tokens[j + 1];
      const isIntlPair = intlWords.includes(pair);
      const isCandidatePair = candidateSet.has(pair);
      const isNumberClassifier = /^[一二两三四五六七八九十百千万几多每][个块本件张条杯位只架间座份斤元天年号点次]$/.test(pair);
      const isCommonGrammarPair = /^(不是|没有|不要|不用|不能|不会|不想|不去|不好|如果|虽然|因为|所以|而且|但是|正在|已经|一起|一直|常常|经常|以前|以后|这里|那里|哪里|这么|那么|怎么|什么|哪个|谁的|他们|她们|我们|你们|大家|自己|电话|学校|书包|铅笔|电脑|手机|桌子|椅子|医生|护士|司机|先生|女士|小姐|孩子|家人|爸爸|妈妈|哥哥|姐姐|弟弟|妹妹|爷爷|奶奶)$/.test(pair);

      if (isIntlPair || isCandidatePair || isNumberClassifier || isCommonGrammarPair) {
        merged.push(pair);
        j += 2;
        continue;
      }
    }
    merged.push(tokens[j]);
    j++;
  }

  return merged;
}

export interface SegmentItem {
  id: number;
  text: string;
}

export function createShuffledSegments(segments: string[]): SegmentItem[] {
  const items = segments.map((text, idx) => ({ id: idx, text }));
  if (items.length <= 1) return items;

  let shuffled = [...items];
  let attempts = 0;
  while (attempts < 6) {
    shuffled.sort(() => Math.random() - 0.5);
    const isSame = shuffled.every((item, idx) => item.id === idx);
    if (!isSame) {
      break;
    }
    attempts++;
  }
  return shuffled;
}
