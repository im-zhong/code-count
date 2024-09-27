// 2024/9/27
// zhangzhong

// 在这里我们可以将结果进行输出，然后进行对比
// 因为这个功能会非常常用，后期我们每次更新代码的时候，都应该跑一下这个测试
// 然后生成文件之后做一次diff，就能知道我们的代码是否有问题，所以最好是做成一个命令
// 这个命令的功能就是在当前workspace下面生成一个新的文件，然后这个文件会记录做一个summary
// 生成所有的文件的代码行数，为了保证diff的准确性，所有代码文件按名字排序即可
// file: Codes: 100, Comments: 20
// ...
// 不要携带总行行数，否则一旦总行书不同，会导致所有的行都不同，这样我们就无法通过diff判断是那个文件有问题了
// 这是一个新的feature，所以我们家一个feature分支实现

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
  // open up a file and write the summary
  // 哦 那现在问题来了，我们应该在哪里生成这个文件呢？
  // 往往我们每个workspace都是不同的项目
  // 那么我们生成一个总的文件确实是不合理的
  // 所以应该每个workspace生成一个文件
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
