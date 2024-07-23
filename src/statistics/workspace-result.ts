// 2024/7/22
// zhangzhong

import { Result } from "../analyzer/types";
import { SUPPORTED_LANGUAGES } from "../conf/support-languages";
import { FolderCounter } from "./count-workspace";
import * as vscode from "vscode";
import { getGitIgnoreFilter } from "./git-ignore-filter";
import { FolderResult, WorkspaceStatistics } from "./types";
import { DetailedResult } from "../analyzer/types";
import { makeAnalyzer } from "../analyzer/factory";
// 即然如此 这个类型定义是统一的
// 那么我们可以提取出来 放在types里面

// 因为现在的类型比较复杂 所以最好是定义一些类型
// 比如我们的结果是workspace -> workspace statistics
//

export class WorkspaceCounter {
  // workspaces: {
  //   [key: string]: { [key: string]: Result };
  // };

  private statistics: {
    [workspaceFolder: string]: WorkspaceStatistics;
  };

  constructor() {
    this.statistics = {};
  }

  addWorkspace(workspace: string) {
    this.statistics[workspace] = {};
  }

  deleteFile({
    workspaceName: workspaceFolder,
    relativeFilePath,
  }: {
    workspaceName: string;
    relativeFilePath: string;
  }) {
    if (workspaceFolder in this.statistics) {
      delete this.statistics[workspaceFolder][relativeFilePath];
    }
  }

  // when user save a file, we analyze the file and get the result
  // then we get workspace, relativeFilePath, and its language, and the result
  // to update the workspace result
  updateFile({
    workspaceName,
    relativeFilePath,
    analyzeResult,
    language,
  }: {
    workspaceName: string;
    relativeFilePath: string;
    // languageId: string;
    analyzeResult: Result;
    language: string;
  }) {
    // we do not use languageId, we use our own language
    // but the input function could use languageID
    // cause we get it directly from vscode
    if (!(workspaceName in this.statistics)) {
      this.addWorkspace(workspaceName);
    }
    const workspace = this.statistics[workspaceName];

    // if (!(relativeFilePath in workspace)) {
    //   workspace[relativeFilePath] = {};
    // }
    workspace[language][relativeFilePath] = analyzeResult;
  }

  // get the statistic of a certain file
  getStatistics({
    workspaceFolder,
    text,
    languageId,
    relativePath,
  }: {
    workspaceFolder?: vscode.WorkspaceFolder;
    languageId: string;
    text: string;
    relativePath: string;
  }): {
    result?: DetailedResult;
    totalCodes: number;
    totalComments: number;
  } {
    let totalCodes = 0;
    let totalComments = 0;
    let result = undefined;

    // if (workspace in this.statistics) {
    //   for (const [file, result] of Object.entries(
    //     this.statistics[language][workspace]
    //   )) {
    //     totalCodes += result.codes;
    //     totalComments += result.comments;
    //   }
    // }

    const analyzer = makeAnalyzer({
      text: text,
      languageId: languageId,
    });
    if (!analyzer) {
      return { totalCodes, totalComments };
    }

    result = analyzer.analyze();
    if (!result) {
      return { totalCodes, totalComments };
    }

    return { result, totalCodes, totalComments };
  }

  // statistic of the whole workspace of a cetrain language
  async statistic({
    workspace,
    language,
  }: {
    workspace: vscode.WorkspaceFolder;
    language: string;
  }) {
    // 遍历我们支持的语言

    // 为了尽可能加快加载速度
    // 对所有语言的分析都应该是lazy的
    // 也就是说我们应该支持某个worksapce的某个语言的分析
    // TODO：
    // 我还需要维护gitignore文件 当保存文件的时候还需要分析gitignore带来的影响

    const folderCounter = new FolderCounter({
      folder: workspace,
      language,
      filter: await getGitIgnoreFilter({ workspace }),
    });

    this.statistics[workspace.name][language] =
      await folderCounter.countFolder();
  }
}
