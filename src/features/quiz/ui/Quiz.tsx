import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  MultipleChoiceItem,
  MultipleSelectItem,
  QuizData,
  QuizItem,
  ShortAnswerItem,
  TrueFalseItem,
} from '../types';

interface Props {
  data: QuizData;
  storageKey: string;
}

type Answer = number | number[] | boolean | string | null;

interface AttemptRecord {
  score: number;
  total: number;
  updatedAt: number;
}

function loadAttempt(storageKey: string): AttemptRecord | null {
  try {
    const raw = localStorage.getItem(`quiz:last:${storageKey}`);
    if (!raw) return null;
    return JSON.parse(raw) as AttemptRecord;
  } catch {
    return null;
  }
}

function saveAttempt(storageKey: string, record: AttemptRecord): void {
  try {
    localStorage.setItem(`quiz:last:${storageKey}`, JSON.stringify(record));
  } catch {
    // localStorage disabled
  }
}

function initialAnswer(item: QuizItem): Answer {
  switch (item.type) {
    case 'multiple-select':
      return [] as number[];
    case 'short-answer':
      return '';
    case 'true-false':
    case 'multiple-choice':
    default:
      return null;
  }
}

function normalizeShort(value: string, item: ShortAnswerItem): string {
  return item.caseSensitive ? value.trim() : value.trim().toLowerCase();
}

function isCorrect(item: QuizItem, answer: Answer): boolean {
  switch (item.type) {
    case 'multiple-choice':
      return typeof answer === 'number' && answer === item.correct;
    case 'true-false':
      return typeof answer === 'boolean' && answer === item.correct;
    case 'multiple-select': {
      if (!Array.isArray(answer)) return false;
      const expected = new Set(item.correct);
      const given = new Set(answer);
      if (expected.size !== given.size) return false;
      for (const v of expected) if (!given.has(v)) return false;
      return true;
    }
    case 'short-answer': {
      if (typeof answer !== 'string') return false;
      const user = normalizeShort(answer, item);
      if (item.useRegex) {
        try {
          const flags = item.caseSensitive ? '' : 'i';
          const re = new RegExp(item.correct, flags);
          return re.test(answer.trim());
        } catch {
          return false;
        }
      }
      const target = item.caseSensitive
        ? item.correct.trim()
        : item.correct.trim().toLowerCase();
      return user === target;
    }
    default:
      return false;
  }
}

function isAnswered(item: QuizItem, answer: Answer): boolean {
  if (item.type === 'multiple-select') return Array.isArray(answer) && answer.length > 0;
  if (item.type === 'short-answer') return typeof answer === 'string' && answer.trim().length > 0;
  if (item.type === 'true-false') return typeof answer === 'boolean';
  return answer !== null && answer !== undefined;
}

function MultipleChoice({
  item,
  answer,
  submitted,
  onChange,
  namePrefix,
}: {
  item: MultipleChoiceItem;
  answer: number | null;
  submitted: boolean;
  onChange: (v: number) => void;
  namePrefix: string;
}) {
  return (
    <fieldset className="quiz-fieldset" role="radiogroup">
      <legend className="quiz-question">{item.question}</legend>
      <ol className="quiz-options">
        {item.options.map((opt, i) => {
          const chosen = answer === i;
          const correctChoice = submitted && i === item.correct;
          const wrongChoice = submitted && chosen && i !== item.correct;
          return (
            <li key={i}>
              <label
                className={[
                  'quiz-option',
                  chosen ? 'is-chosen' : '',
                  correctChoice ? 'is-correct' : '',
                  wrongChoice ? 'is-wrong' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  type="radio"
                  name={`${namePrefix}-mc`}
                  value={i}
                  checked={chosen}
                  disabled={submitted}
                  onChange={() => onChange(i)}
                />
                <span>{opt}</span>
              </label>
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}

function MultipleSelect({
  item,
  answer,
  submitted,
  onChange,
}: {
  item: MultipleSelectItem;
  answer: number[];
  submitted: boolean;
  onChange: (v: number[]) => void;
}) {
  const toggle = (i: number) => {
    if (answer.includes(i)) onChange(answer.filter((v) => v !== i));
    else onChange([...answer, i].sort());
  };
  const correctSet = new Set(item.correct);
  return (
    <fieldset className="quiz-fieldset">
      <legend className="quiz-question">
        {item.question}
        <span className="quiz-hint"> (여러 개 선택)</span>
      </legend>
      <ol className="quiz-options">
        {item.options.map((opt, i) => {
          const chosen = answer.includes(i);
          const shouldBeCorrect = submitted && correctSet.has(i);
          const wrongChoice = submitted && chosen && !correctSet.has(i);
          return (
            <li key={i}>
              <label
                className={[
                  'quiz-option',
                  chosen ? 'is-chosen' : '',
                  shouldBeCorrect ? 'is-correct' : '',
                  wrongChoice ? 'is-wrong' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  type="checkbox"
                  checked={chosen}
                  disabled={submitted}
                  onChange={() => toggle(i)}
                />
                <span>{opt}</span>
              </label>
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}

function TrueFalse({
  item,
  answer,
  submitted,
  onChange,
  namePrefix,
}: {
  item: TrueFalseItem;
  answer: boolean | null;
  submitted: boolean;
  onChange: (v: boolean) => void;
  namePrefix: string;
}) {
  return (
    <fieldset className="quiz-fieldset" role="radiogroup">
      <legend className="quiz-question">{item.question}</legend>
      <ol className="quiz-options quiz-options-inline">
        {[true, false].map((v) => {
          const label = v ? '참 (True)' : '거짓 (False)';
          const chosen = answer === v;
          const correctChoice = submitted && v === item.correct;
          const wrongChoice = submitted && chosen && v !== item.correct;
          return (
            <li key={String(v)}>
              <label
                className={[
                  'quiz-option',
                  chosen ? 'is-chosen' : '',
                  correctChoice ? 'is-correct' : '',
                  wrongChoice ? 'is-wrong' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <input
                  type="radio"
                  name={`${namePrefix}-tf`}
                  value={String(v)}
                  checked={chosen}
                  disabled={submitted}
                  onChange={() => onChange(v)}
                />
                <span>{label}</span>
              </label>
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}

function ShortAnswer({
  item,
  answer,
  submitted,
  onChange,
}: {
  item: ShortAnswerItem;
  answer: string;
  submitted: boolean;
  onChange: (v: string) => void;
}) {
  const correct = submitted && isCorrect(item, answer);
  return (
    <div className="quiz-fieldset">
      <label className="quiz-question quiz-short-label">
        <span>{item.question}</span>
        <input
          type="text"
          className={[
            'quiz-short-input',
            submitted ? (correct ? 'is-correct' : 'is-wrong') : '',
          ]
            .filter(Boolean)
            .join(' ')}
          value={answer}
          onChange={(e) => onChange(e.target.value)}
          disabled={submitted}
          placeholder="답 입력"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>
      {submitted && !correct && (
        <p className="quiz-short-answer-hint">
          정답: <code>{item.correct}</code>
          {item.caseSensitive ? ' (대소문자 구분)' : ''}
          {item.useRegex ? ' (정규식)' : ''}
        </p>
      )}
    </div>
  );
}

export default function Quiz({ data, storageKey }: Props) {
  const [answers, setAnswers] = useState<Answer[]>(() => data.items.map(initialAnswer));
  const [submitted, setSubmitted] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<AttemptRecord | null>(null);

  useEffect(() => {
    setLastAttempt(loadAttempt(storageKey));
  }, [storageKey]);

  const setAnswer = useCallback((index: number, value: Answer) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const allAnswered = useMemo(
    () => data.items.every((item, i) => isAnswered(item, answers[i])),
    [data.items, answers],
  );

  const scored = useMemo(() => {
    if (!submitted) return null;
    let score = 0;
    for (let i = 0; i < data.items.length; i++) {
      if (isCorrect(data.items[i], answers[i])) score++;
    }
    return { score, total: data.items.length };
  }, [submitted, data.items, answers]);

  const submit = () => {
    if (!allAnswered) return;
    setSubmitted(true);
    let score = 0;
    for (let i = 0; i < data.items.length; i++) {
      if (isCorrect(data.items[i], answers[i])) score++;
    }
    saveAttempt(storageKey, { score, total: data.items.length, updatedAt: Date.now() });
    setLastAttempt({ score, total: data.items.length, updatedAt: Date.now() });
  };

  const retry = () => {
    setAnswers(data.items.map(initialAnswer));
    setSubmitted(false);
  };

  return (
    <section className="quiz not-prose" aria-label={data.title ?? '확인 문제'}>
      <header className="quiz-header">
        <h3 className="quiz-title">
          <span aria-hidden="true">📝</span> {data.title ?? '확인 문제'}
          <span className="quiz-meta">{data.items.length}문제</span>
        </h3>
        {lastAttempt && !submitted && (
          <p className="quiz-last-attempt" aria-live="polite">
            지난 점수: <strong>{lastAttempt.score}/{lastAttempt.total}</strong>
          </p>
        )}
      </header>

      <ol className="quiz-items">
        {data.items.map((item, i) => {
          const namePrefix = `${storageKey}-${i}`;
          let body: React.ReactNode = null;
          if (item.type === 'multiple-choice') {
            body = (
              <MultipleChoice
                item={item}
                answer={answers[i] as number | null}
                submitted={submitted}
                onChange={(v) => setAnswer(i, v)}
                namePrefix={namePrefix}
              />
            );
          } else if (item.type === 'multiple-select') {
            body = (
              <MultipleSelect
                item={item}
                answer={(answers[i] as number[]) ?? []}
                submitted={submitted}
                onChange={(v) => setAnswer(i, v)}
              />
            );
          } else if (item.type === 'true-false') {
            body = (
              <TrueFalse
                item={item}
                answer={answers[i] as boolean | null}
                submitted={submitted}
                onChange={(v) => setAnswer(i, v)}
                namePrefix={namePrefix}
              />
            );
          } else if (item.type === 'short-answer') {
            body = (
              <ShortAnswer
                item={item}
                answer={(answers[i] as string) ?? ''}
                submitted={submitted}
                onChange={(v) => setAnswer(i, v)}
              />
            );
          }
          const showFeedback = submitted;
          const correct = showFeedback ? isCorrect(item, answers[i]) : false;
          return (
            <li key={i} className={['quiz-item', showFeedback ? (correct ? 'is-correct' : 'is-wrong') : ''].filter(Boolean).join(' ')}>
              <div className="quiz-item-index">Q{i + 1}</div>
              <div className="quiz-item-body">
                {body}
                {showFeedback && (
                  <div className="quiz-feedback" role="status" aria-live="polite">
                    <span className={`quiz-feedback-badge ${correct ? 'is-correct' : 'is-wrong'}`}>
                      {correct ? '✔ 정답' : '✕ 오답'}
                    </span>
                    {item.explanation && <p className="quiz-explanation">{item.explanation}</p>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <footer className="quiz-footer">
        {!submitted ? (
          <button
            type="button"
            className="quiz-submit"
            onClick={submit}
            disabled={!allAnswered}
            aria-label="채점"
          >
            채점하기
          </button>
        ) : (
          <>
            <p className="quiz-score" aria-live="polite">
              최종 점수: <strong>{scored?.score}</strong> / {scored?.total}
            </p>
            <button type="button" className="quiz-retry" onClick={retry} aria-label="다시 풀기">
              🔄 다시 풀기
            </button>
          </>
        )}
      </footer>
    </section>
  );
}
