export interface MultipleChoiceItem {
  type: 'multiple-choice';
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export interface MultipleSelectItem {
  type: 'multiple-select';
  question: string;
  options: string[];
  correct: number[];
  explanation?: string;
}

export interface TrueFalseItem {
  type: 'true-false';
  question: string;
  correct: boolean;
  explanation?: string;
}

export interface ShortAnswerItem {
  type: 'short-answer';
  question: string;
  correct: string;
  caseSensitive?: boolean;
  useRegex?: boolean;
  explanation?: string;
}

export type QuizItem =
  | MultipleChoiceItem
  | MultipleSelectItem
  | TrueFalseItem
  | ShortAnswerItem;

export interface QuizData {
  title?: string;
  items: QuizItem[];
}
