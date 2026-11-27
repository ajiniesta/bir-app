export interface ExamType {
  id: number;
  code: string;
  name: string;
}

export interface ReviewFiltersResponse {
  categories: string[];
  tags: string[];
}

export interface ReviewSessionSummary {
  id: number;
  examTypeCode: string;
  examTypeName: string;
  categories: string[];
  tags: string[];
  onlyDoubt?: boolean;
  onlyFailed?: boolean;
  answeredCount: number;
  correctCount: number;
  totalMatchingQuestions: number;
  createdAt: string;
  finished: boolean;
}

export interface ReviewCategoryStats {
  category: string;
  answered: number;
  correct: number;
  accuracy: number;
}

export interface ReviewOption {
  letter: string;
  text: string;
}

export interface ReviewSessionItem {
  position: number;
  questionId: number;
  questionText: string;
  category?: string | null;
  tag?: string | null;
  tags?: string[];
  explanation?: string | null;
  options: ReviewOption[];
  answered: boolean;
  selectedLetter?: string | null;
  correct?: boolean | null;
  correctLetter?: string | null;
}

export interface ReviewSessionResponse {
  id: number;
  examTypeCode: string;
  examTypeName: string;
  categories: string[];
  tags: string[];
  onlyDoubt?: boolean;
  onlyFailed?: boolean;
  totalMatchingQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
  hasMoreQuestions: boolean;
  finished: boolean;
  byCategory: ReviewCategoryStats[];
  items: ReviewSessionItem[];
}
