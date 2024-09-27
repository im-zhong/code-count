// 2024/9/27
// zhangzhong

// summary file as a golden test result
// when we update the code, we can run the test to compare the result with diff

import * as fs from "fs/promises";
import path from "path";

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import { SupportedLanguage } from "../common/supported-languages";
import { WorkspaceCounter } from "../counter/workspace-counter";

export async function summarize({
  workspaceFolders,
}: {
  workspaceFolders: readonly vscode.WorkspaceFolder[];
}) {
  // generate a summary file for each workspace
  for (const workspaceFolder of workspaceFolders) {
    await summarizeWorkspace({
      workspacePath: workspaceFolder.uri.fsPath,
    });
  }
}

export async function summarizeWorkspace({
  workspacePath,
}: {
  workspacePath: string;
}) {
  try {
    let workspaceCounter = new WorkspaceCounter();
    for (let language of Object.values(SupportedLanguage)) {
      await workspaceCounter.countWorkspace({ workspacePath, language });
    }

    // workspacePath is not the same, but we could use it as the file name
    let summary = "";
    const workspaceResult =
      workspaceCounter.getWorkspaceResults()[workspacePath];
    for (const language of Object.keys(workspaceResult).sort()) {
      const { totalCodes, totalComments } =
        workspaceCounter.getTotalCodesAndComments({
          workspacePath,
          language: language as SupportedLanguage,
        });
      if (totalCodes === 0 && totalComments === 0) {
        continue;
      }

      summary += `[${language}] total ${totalCodes} codes, ${totalComments} comments\n`;
      let i = 1;
      const folderResult = workspaceResult[language];
      for (const absolutePath of Object.keys(folderResult).sort()) {
        const fileResult = folderResult[absolutePath];
        summary += `${i}. ${absolutePath}: ${fileResult.codes} codes, ${fileResult.comments} comments\n`;
        i++;
      }
      summary += "\n";

      const summaryPath = path.join(workspacePath, "summary.txt");
      await fs.writeFile(summaryPath, summary);
      vscode.window.showInformationMessage(
        `Summary file generated at ${summaryPath}`,
      );
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to summarize: ${error}`);
  }
}
