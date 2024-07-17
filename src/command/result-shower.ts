// 2024/7/17
// zhangzhong

import { Result } from "../analyzer/types";
import { WorkspaceResult } from "../analyzer/types";
import * as vscode from "vscode";

export function showResult({
  languageId,
  results,
}: {
  languageId: string;
  results: Result[];
}): string {
  // 如果我们弹出多个消息框的提示的话
  // 会显得非常的烦
  // 所以内容应该都出现在一个框里面
  // 所以这个函数实际上是返回的一个字符串
  return `Language: ${languageId}\n`;
}

export function showWorkspaceResults({
  workspaceResults,
}: {
  workspaceResults: WorkspaceResult[];
}) {
  // TODO: write the result to a file and open it in vscode
  vscode.window.showInformationMessage("show workspace results");
}
