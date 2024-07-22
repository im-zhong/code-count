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

// workspace statistics only need the simple result

export interface Result {
  all: number;
  codes: number;
  comments: number;
}

export interface DetailedResult extends Result {
  file: string | undefined;
  language: string;
  // all: number;
  // codes: number;
  // comments: number;
  lineClasses: LineClass[];
}

// export interface WorkspaceResult {
//   workspace: string;
//   language: string;
//   results: DetailedResult[];
// }

// analyzer return detailed result
// export interface DetailedResult {
//   relativePath: string;
//   language: string;
//   lines: number;
//   codes: number;
//   comments: number;
//   lineClasses: LineClass[];
// }
