// 2024/7/8
// zhangzhong

export enum LineClass {
  Blank,
  Code,
  LineComment,
  BlockComment,
  CodeComment,
  Comment,
}

export interface Result {
  file: string | undefined;
  all: number;
  codes: number;
  comments: number;
  lineClasses: LineClass[];
}

export interface WorkspaceResult {
  workspace: string;
  language: string;
  results: Result[];
}
