// 2024/7/22
// zhangzhong

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

// 2024/7/8
// zhangzhong

// workspace statistics only need the simple result

// export interface Result {
//   all: number;
//   codes: number;
//   comments: number;
// }

export interface FileResult {
  // file: string | undefined;
  // language: string;
  all: number;
  codes: number;
  comments: number;
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

export interface Statistics {
  [key: string]: FileResult;
}

export interface FolderResult {
  [relativePath: string]: FileResult;
}

export interface WorkspaceStatistics {
  // 我发现他这里没法指定名字
  // 我没法指定一个映射类型
  // 他的key实际上是有一个名字的
  // 这样就很好了，最好value也有一个名字
  // {keyName: keyType -> valueName: valueType}
  [language: string]: FolderResult;
}
