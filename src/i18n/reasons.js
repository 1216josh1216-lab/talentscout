// Human-readable explanations for engine reason codes, in English and Chinese.

const T = {
  en: {
    kw_matched: (p) =>
      p.matchedAs.toLowerCase() === p.term.toLowerCase()
        ? `Keyword "${p.term}" found.`
        : `Keyword "${p.term}" found via alias "${p.matchedAs}".`,
    kw_missing: (p) => `Keyword "${p.term}" not found${p.aliases?.length ? ` (also tried: ${p.aliases.join(', ')})` : ''}.`,
    kw_negated: (p) => `Keyword "${p.term}" appears only in a negated phrase, so it does not count.`,
    kw_zone_only: (p) => `Keyword "${p.term}" appears only in the header block, which is hidden from the rules while protected attributes are ignored.`,
    school_matched: (p) => `School "${p.school}" is in ${p.tier}, worth ${Math.round(p.tierScore * 100)}% of the school weight.`,
    school_none: () => 'No school from any tier was found in the education section.',
    grad_in_window: (p) => `Graduation year ${p.year} is inside the window ${p.from}–${p.to}.`,
    grad_outside: (p) => `Graduation year ${p.year} is outside the window ${p.from}–${p.to}.`,
    grad_unknown: () => 'No graduation year could be found in the education section.',
    grad_in_progress: () => 'Degree is in progress and no expected graduation year is stated.',
    flag_missing_must_have: () => 'Missing must-have',
    flag_outside_window: () => 'Outside graduation window',
    flag_grad_unknown: () => 'Graduation year unknown',
    flag_unreadable: () => 'Could not read (no text found; scanned PDF?)',
  },
  zh: {
    kw_matched: (p) =>
      p.matchedAs.toLowerCase() === p.term.toLowerCase()
        ? `命中关键词“${p.term}”。`
        : `通过别名“${p.matchedAs}”命中关键词“${p.term}”。`,
    kw_missing: (p) => `未找到关键词“${p.term}”${p.aliases?.length ? `（已尝试别名：${p.aliases.join('、')}）` : ''}。`,
    kw_negated: (p) => `关键词“${p.term}”仅出现在否定表述中，不计分。`,
    kw_zone_only: (p) => `关键词“${p.term}”只出现在页眉信息区，在忽略受保护属性时该区域对规则不可见。`,
    school_matched: (p) => `院校“${p.school}”属于 ${p.tier}，获得院校权重的 ${Math.round(p.tierScore * 100)}%。`,
    school_none: () => '教育经历中未找到任何分级名单内的院校。',
    grad_in_window: (p) => `毕业年份 ${p.year} 在要求范围 ${p.from}–${p.to} 内。`,
    grad_outside: (p) => `毕业年份 ${p.year} 不在要求范围 ${p.from}–${p.to} 内。`,
    grad_unknown: () => '教育经历中未能识别毕业年份。',
    grad_in_progress: () => '学位在读，且未注明预计毕业年份。',
    flag_missing_must_have: () => '缺少必备项',
    flag_outside_window: () => '不在毕业时间范围内',
    flag_grad_unknown: () => '毕业年份未知',
    flag_unreadable: () => '无法读取（未提取到文字，可能是扫描件）',
  },
};

export function formatReason(reason, lang = 'en') {
  const table = T[lang] ?? T.en;
  const fn = table[reason.code] ?? T.en[reason.code];
  return fn ? fn(reason.params ?? {}) : reason.code;
}

export function formatFlag(flag, lang = 'en') {
  return formatReason({ code: `flag_${flag}`, params: {} }, lang);
}
