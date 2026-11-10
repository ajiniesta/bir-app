export interface ExamType {
  id: number;
  code: string;
  name: string;
}

export interface FreeSessionOption {
  letter: string;
  text: string;
}

export interface FreeSessionItem {
  position: number;
  questionId: number;
  questionText: string;
  category?: string | null;
  tag?: string | null;
  explanation?: string | null;
  options: FreeSessionOption[];
  answered: boolean;
  selectedLetter?: string | null;
  correct?: boolean | null;
  correctLetter?: string | null;
}

export interface FreeSessionResponse {
  id: number;
  examTypeCode?: string | null;
  examTypeName?: string | null;
  category?: string | null;
  tag?: string | null;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  finished: boolean;
  items: FreeSessionItem[];
}

export interface MyProposalResponse {
  id: number;
  questionId: number;
  status: string;
  proposedLetter?: string | null;
  proposedText?: string | null;
  comment?: string | null;
}
