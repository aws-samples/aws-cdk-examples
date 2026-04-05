export type StepName = 'install' | 'build' | 'test' | 'synth';
export type ProjectStatus = 'success' | 'failed' | 'skipped';
export type Language = 'typescript' | 'python' | 'java' | 'go' | 'csharp' | 'unknown';

export interface StepResult {
  name: StepName;
  success: boolean;
  durationMs: number;
  output: string;
}

export interface MessageRecord {
  level: string;
  message: string;
  timestamp: string;
  code?: string;
}

export interface ProjectResult {
  name: string;
  path: string;
  language: Language;
  status: ProjectStatus;
  steps: StepResult[];
  messages: MessageRecord[];
  durationMs: number;
}

export interface BuildReport {
  timestamp: string;
  durationMs: number;
  concurrency: number;
  summary: { total: number; success: number; failed: number; skipped: number };
  projects: ProjectResult[];
}

export interface DiscoveredProject {
  name: string;
  path: string;
  language: Language;
  skip: boolean;
  skipReason?: string;
}
