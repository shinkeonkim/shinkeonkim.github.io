export type ComplexityLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ComplexityMetrics {
  totalWords: number;
  sentenceCount: number;
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  wikilinkCount: number;
  jargonRatio: number;
  formulaBlockCount: number;
  formulaDensity: number;
  score: number;
  level: ComplexityLevel;
}

const HANGUL_SYLLABLE_RE = /[\uac00-\ud7af]/g;
const WIKILINK_RE = /\[\[[^\]]+\]\]/g;
const CODE_FENCE_RE = /```[\s\S]*?```/g;
const MATH_BLOCK_RE = /\$\$[\s\S]*?\$\$/g;
const SENTENCE_SPLIT_RE = /[.!?…]|\n\s*\n/g;

function normalize(v: number, lo: number, hi: number): number {
  if (hi <= lo) return 0;
  const clipped = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  return clipped * 100;
}

function stripFrontmatter(body: string): string {
  return body.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

function countSyllables(text: string): number {
  const hangulMatches = text.match(HANGUL_SYLLABLE_RE);
  const hangul = hangulMatches ? hangulMatches.length : 0;
  const ascii = (text.match(/[A-Za-z]+/g) ?? []).reduce(
    (sum, w) => sum + Math.max(1, Math.round(w.length / 2.5)),
    0,
  );
  return hangul + ascii;
}

export function analyze(rawBody: string): ComplexityMetrics {
  const body = stripFrontmatter(rawBody);
  const wikilinkCount = (body.match(WIKILINK_RE) ?? []).length;
  const formulaBlockCount =
    (body.match(CODE_FENCE_RE) ?? []).length + (body.match(MATH_BLOCK_RE) ?? []).length;

  const cleaned = body
    .replace(CODE_FENCE_RE, ' ')
    .replace(MATH_BLOCK_RE, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(WIKILINK_RE, (m) => m.replace(/\[|\]/g, ''))
    .replace(/^[ \t]*>+\s?/gm, '')
    .replace(/^[ \t]{0,3}#{1,6}\s+/gm, '')
    .replace(/[*_~`>]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const totalWords = cleaned.split(/\s+/).filter(Boolean).length;
  const sentenceMatches = cleaned.match(SENTENCE_SPLIT_RE);
  const sentenceCount = Math.max(1, sentenceMatches ? sentenceMatches.length : 1);
  const avgSentenceLength = totalWords / sentenceCount;
  const totalSyllables = countSyllables(cleaned);
  const avgSyllablesPerWord = totalWords > 0 ? totalSyllables / totalWords : 0;
  const jargonRatio = totalWords > 0 ? wikilinkCount / totalWords : 0;
  const formulaDensity = totalWords > 0 ? formulaBlockCount / totalWords : 0;

  const score =
    0.30 * normalize(avgSentenceLength, 10, 40) +
    0.20 * normalize(avgSyllablesPerWord, 1.5, 3.0) +
    0.30 * normalize(jargonRatio, 0.01, 0.10) +
    0.20 * normalize(formulaDensity, 0.0, 0.05);

  const level: ComplexityLevel =
    score < 33 ? 'beginner' : score < 66 ? 'intermediate' : 'advanced';

  return {
    totalWords,
    sentenceCount,
    avgSentenceLength,
    avgSyllablesPerWord,
    wikilinkCount,
    jargonRatio,
    formulaBlockCount,
    formulaDensity,
    score,
    level,
  };
}

export function resolveLevel(
  body: string,
  override?: ComplexityLevel,
): { level: ComplexityLevel; metrics: ComplexityMetrics; source: 'override' | 'auto' } {
  const metrics = analyze(body);
  if (override) {
    return { level: override, metrics, source: 'override' };
  }
  return { level: metrics.level, metrics, source: 'auto' };
}
