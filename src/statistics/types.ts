// 2024/7/22
// zhangzhong

import { Result } from "../analyzer/types";

export interface Statistics {
  [key: string]: Result;
}

export interface FolderResult {
  [relativePath: string]: Result;
}

export interface WorkspaceStatistics {
  // 我发现他这里没法指定名字
  // 我没法指定一个映射类型
  // 他的key实际上是有一个名字的
  // 这样就很好了，最好value也有一个名字
  // {keyName: keyType -> valueName: valueType}
  [language: string]: FolderResult;
}
