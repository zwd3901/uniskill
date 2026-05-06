export type LinkStatus = 'linked' | 'broken' | 'missing' | 'conflict';

export interface Target {
  name: string;
  path: string;
}

export interface Config {
  source: string;
  targets: Target[];
}

export interface TargetStatus {
  name: string;
  status: LinkStatus;
  targetPath: string;
  sourcePath: string;
  detail?: string;
}

export interface LinkResult {
  name: string;
  success: boolean;
  action: 'created' | 'skipped' | 'replaced' | 'error';
  detail?: string;
}
