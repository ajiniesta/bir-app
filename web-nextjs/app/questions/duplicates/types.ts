export interface ExamType {
  id: number;
  code: string;
  name: string;
}

export interface DuplicateCandidate {
  id: number;
  category: string | null;
  tag: string | null;
  hasExplanation: boolean;
  optionCount: number;
  inMockExam: boolean;
  hasProposals: boolean;
  inFreeSessions: boolean;
}

export interface DuplicateQuestionGroup {
  examTypeId: number;
  examTypeCode: string;
  text: string;
  keepId: number;
  keepReason: string;
  duplicates: DuplicateCandidate[];
}

export interface SimilarTextGroup {
  examTypeId: number;
  examTypeCode: string;
  text: string;
  questionIds: number[];
}

export interface DuplicateQuestionsResponse {
  groups: DuplicateQuestionGroup[];
  totalGroups: number;
  totalDuplicates: number;
  truncated: boolean;
  similarGroups: SimilarTextGroup[];
}

export interface DuplicatePurgeResponse {
  groupsProcessed: number;
  deleted: number;
  mockExamLinksRepointed: number;
  mockExamLinksRemoved: number;
  positionsRenumbered: number;
  proposalsRepointed: number;
  proposalsDeleted: number;
  sessionItemsRepointed: number;
  remaining: number;
  notes: string[];
}
