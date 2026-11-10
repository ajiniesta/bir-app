export interface ExamType {
  id: number;
  code: string;
  name: string;
}

export interface ProposalOption {
  letter: string;
  text: string;
  isCorrect: boolean;
}

export interface AnswerProposal {
  id: number;
  questionId: number;
  questionText: string;
  category?: string | null;
  tag?: string | null;
  examTypeCode?: string | null;
  correctLetter?: string | null;
  options: ProposalOption[];
  proposedBy?: string | null;
  proposedByDisplayName?: string | null;
  proposedLetter?: string | null;
  proposedText?: string | null;
  comment: string;
  source?: string | null;
  sourceId?: number | null;
  position?: number | null;
  selectedLetter?: string | null;
  status: string; // "PENDING" | "ACCEPTED" | "REJECTED"
  createdAt?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewerNote?: string | null;
  appliedBy?: string | null;
  appliedAt?: string | null;
}
