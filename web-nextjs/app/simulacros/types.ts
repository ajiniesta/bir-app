export interface MockExamOption {
  letter: string;
  text: string;
  correct?: boolean | null;
}

export interface MockExamQuestionSummary {
  position: number;
  questionId: number;
  text: string;
  category: string | null;
  tag: string | null;
  explanation: string | null;
  options: MockExamOption[];
}

export interface MockExamSummary {
  id: number;
  title: string;
  description: string | null;
  examTypeCode: string;
  examTypeName: string;
  questionCount: number;
  attemptCount: number;
  finishedCount: number;
  bestAccuracy: number | null;
  inProgressAttemptId: number | null;
}

export interface MockExamResponse {
  id: number;
  title: string;
  description: string | null;
  examTypeId?: number;
  examTypeCode: string;
  examTypeName: string;
  questionCount: number;
  questions: MockExamQuestionSummary[];
}

export interface MockExamAttemptSummary {
  id: number;
  mockExamId: number;
  startedAt: string;
  finishedAt: string | null;
  finished: boolean;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
}

export interface MockExamAttemptItem {
  position: number;
  questionId: number;
  questionText: string;
  category: string | null;
  tag: string | null;
  explanation: string | null;
  answered: boolean;
  selectedLetter: string | null;
  correct: boolean | null;
  correctLetter: string | null;
  options: MockExamOption[];
}

export interface MockExamAttemptResponse {
  id: number;
  mockExamId: number;
  mockExamTitle: string;
  examTypeCode: string;
  examTypeName: string;
  startedAt: string;
  finishedAt: string | null;
  finished: boolean;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracy: number;
  items: MockExamAttemptItem[];
}

export interface ExamType {
  id: number;
  code: string;
  name: string;
}

export interface QuestionSummary {
  id: number;
  examTypeId?: number;
  examTypeCode: string;
  text: string;
  category: string | null;
  tag: string | null;
}

export interface MyProposalResponse {
  id: number;
  questionId: number;
  proposedLetter: string | null;
  proposedText: string | null;
  comment: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
}
