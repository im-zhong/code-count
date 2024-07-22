// 2024/7/22
// zhangzhong

import { Result } from "./analyzer/types";

export class WorkspaceResult {
  workspaces: {
    [key: string]: { [key: string]: Result };
  };

  constructor() {
    this.workspaces = {};
  }

  addWorkspace(workspace: string) {
    this.workspaces[workspace] = {};
  }

  deleteFile({
    workspaceName,
    relativeFilePath,
  }: {
    workspaceName: string;
    relativeFilePath: string;
  }) {
    if (workspaceName in this.workspaces) {
      delete this.workspaces[workspaceName][relativeFilePath];
    }
  }

  // when user save a file, we analyze the file and get the result
  // then we get workspace, relativeFilePath, and its language, and the result
  // to update the workspace result
  updateFile({
    workspaceName,
    relativeFilePath,
    analyzeResult,
  }: {
    workspaceName: string;
    relativeFilePath: string;
    // languageId: string;
    analyzeResult: Result;
  }) {
    // we do not use languageId, we use our own language
    // but the input function could use languageID
    // cause we get it directly from vscode
    if (!(workspaceName in this.workspaces)) {
      this.addWorkspace(workspaceName);
    }
    const workspace = this.workspaces[workspaceName];

    // if (!(relativeFilePath in workspace)) {
    //   workspace[relativeFilePath] = {};
    // }
    workspace[relativeFilePath] = analyzeResult;
  }

  // statistic of the whole workspace of a cetrain language
  statistic({ workspace, language }: { workspace: string; language: string }): {
    totalCodes: number;
    totalComments: number;
  } {
    let totalCodes = 0;
    let totalComments = 0;

    if (workspace in this.workspaces) {
      for (const [file, result] of Object.entries(this.workspaces[workspace])) {
        if (result.language !== language) {
          continue;
        }
        totalCodes += result.codes;
        totalComments += result.comments;
      }
    }

    return { totalCodes, totalComments };
  }
}
