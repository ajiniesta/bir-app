export interface QuestionSummary {
  id: number;
  text: string;
  category?: string | null;
  tag?: string | null;
  examTypeCode?: string | null;
}

export interface QuestionPageResponse {
  items: QuestionSummary[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

export interface AnswerOptionResponse {
  id?: number;
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface QuestionDetailResponse {
  id: number;
  text: string;
  category?: string | null;
  tag?: string | null;
  explanation?: string | null;
  examTypeCode?: string | null;
  examTypeName?: string | null;
  answerOptions: AnswerOptionResponse[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ExamType {
  id: number;
  code: string;
  name: string;
}
