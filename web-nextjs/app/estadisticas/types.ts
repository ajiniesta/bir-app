export interface CategoryStats {
  category: string;
  answered: number;
  correct: number;
  accuracy: number;
}

export interface StatsSummary {
  freeSessions: number;
  mockAttempts: number;
  answered: number;
  correct: number;
  accuracy: number;
  byCategory: CategoryStats[];
}

export interface UserStats {
  username: string;
  displayName: string;
  answered: number;
  correct: number;
  accuracy: number;
}

export interface StatsGlobal {
  users: number;
  freeSessions: number;
  mockAttempts: number;
  answered: number;
  correct: number;
  accuracy: number;
  byCategory: CategoryStats[];
  byUser: UserStats[];
}

export interface StatsOverviewResponse {
  mine: StatsSummary;
  global: StatsGlobal | null;
}
