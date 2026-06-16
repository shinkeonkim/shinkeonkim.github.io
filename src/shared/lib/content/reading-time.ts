const CJK_RE = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
const WORD_RE = /[A-Za-z0-9]+/g;
const CODE_FENCE_RE = /```[\s\S]*?```/g;
const HTML_RE = /<[^>]+>/g;

interface ReadingStats {
  cjkChars: number;
  asciiWords: number;
  totalSeconds: number;
  minutes: number;
}

const CJK_CHARS_PER_MINUTE = 500;
const ASCII_WORDS_PER_MINUTE = 220;

export function estimateReadingTime(body: string): ReadingStats {
  const stripped = body.replace(CODE_FENCE_RE, ' ').replace(HTML_RE, ' ');
  let cjkChars = 0;
  for (const ch of stripped) {
    if (CJK_RE.test(ch)) cjkChars++;
  }
  const wordMatches = stripped.match(WORD_RE);
  const asciiWords = wordMatches ? wordMatches.length : 0;
  const cjkSeconds = (cjkChars / CJK_CHARS_PER_MINUTE) * 60;
  const asciiSeconds = (asciiWords / ASCII_WORDS_PER_MINUTE) * 60;
  const totalSeconds = cjkSeconds + asciiSeconds;
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return { cjkChars, asciiWords, totalSeconds, minutes };
}
