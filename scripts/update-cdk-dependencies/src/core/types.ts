export const SUPPORTED_LANGUAGES = ['python', 'java', 'go', 'csharp'] as const;

export type Language = typeof SUPPORTED_LANGUAGES[number];
export type RunMode = 'dry-run' | 'check' | 'write';
export type PlanStatus = 'up-to-date' | 'would-update' | 'manual-migration-required' | 'error';
export type ResultStatus = PlanStatus | 'updated';

export interface DependencyChange {
  readonly dependency: string;
  readonly from: string;
  readonly to: string;
}

export interface TextUpdate {
  readonly path: string;
  readonly before: string;
  readonly after: string;
}

export interface ProjectPlan {
  readonly language: Language;
  readonly manifestPath: string;
  readonly status: PlanStatus;
  readonly changes: readonly DependencyChange[];
  readonly updates?: readonly TextUpdate[];
  readonly message?: string;
  readonly apply?: () => Promise<void>;
}

export interface ProjectResult {
  readonly language: Language;
  readonly manifestPath: string;
  readonly status: ResultStatus;
  readonly changes: readonly DependencyChange[];
  readonly message?: string;
}

export interface TargetVersions {
  readonly source: string;
  readonly cdkCli: string;
  readonly base: {
    readonly cdkLib: string;
    readonly constructs: string;
  };
  readonly python: {
    readonly cdkLib: string;
    readonly constructs: string;
  };
  readonly java: {
    readonly cdkLib: string;
    readonly constructs: string;
  };
  readonly go: {
    readonly cdkLib: string;
    readonly constructs: string;
  };
  readonly csharp: {
    readonly cdkLib: string;
    readonly constructs: string;
  };
}

export interface ScanContext {
  readonly repoRoot: string;
  readonly targets: TargetVersions;
}

export interface LanguageAdapter {
  readonly language: Language;
  scan(context: ScanContext): Promise<ProjectPlan[]>;
}

export interface RunSummary {
  readonly scanned: number;
  readonly upToDate: number;
  readonly pending: number;
  readonly updated: number;
  readonly manual: number;
  readonly errors: number;
}

export interface RunReport {
  readonly mode: RunMode;
  readonly targets: TargetVersions;
  readonly results: readonly ProjectResult[];
  readonly summary: RunSummary;
}
