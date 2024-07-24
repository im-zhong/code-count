// 2024/7/22
// zhangzhong

import * as fs from "fs/promises";

import * as vscode from "vscode";

import { newAnalyzer } from "../analyzer/factory";
import { FileResult, WorkspaceStatistics } from "../common/types";
import { getGitIgnoreFilter } from "../filter/git-ignore-filter";

import { FolderCounter } from "./folder-counter";

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
    // perhaps this workspace alread in there
    // and we alread add some languages in it
    // so we should not cover it
    if (!(workspace in this.statistics)) {
      this.statistics[workspace] = {};
    }
  }

  addLanguage({
    workspaceName,
    language,
  }: {
    workspaceName: string;
    language: string;
  }) {
    this.addWorkspace(workspaceName);
    if (!(language in this.statistics[workspaceName])) {
      this.statistics[workspaceName][language] = {};
    }
  }

  // 现在还有一个问题
  // 就是从extension那边往这边传参数
  // path已经确定了 直接传absolutePath
  // 但是workspace到底输传workspaceName还是workspaceFolder ?
  // 其实主要看这边的需求
  // 那么就只有一个名字
  // 而folder可以提供名字 + path
  // 那显然我们是需要path的，因为内部会调用gitignore工具 需要用到path
  // 所以为了统一 可以都传workspaceFolder？
  // 还是说，应该遵循设计原则，函数只拿他需要的东西，不要多拿；个人感觉这个才是对的
  deleteFile({
    workspaceName,
    language,
    absolutePath,
  }: {
    workspaceName: string;
    language: string;
    absolutePath: string;
  }) {
    if (
      workspaceName in this.statistics &&
      language in this.statistics[workspaceName] &&
      absolutePath in this.statistics[workspaceName][language]
    ) {
      delete this.statistics[workspaceName][language][absolutePath];

      // 删完之后，如果这个language下没有文件了，那么我们就删掉这个language
      if (Object.keys(this.statistics[workspaceName][language]).length === 0) {
        delete this.statistics[workspaceName][language];
      }
      // 如果workspace下没有language了，那么我们就删掉这个workspace
      if (Object.keys(this.statistics[workspaceName]).length === 0) {
        delete this.statistics[workspaceName];
      }
    }
  }

  // when user save a file, we analyze the file and get the result
  // then we get workspace, relativeFilePath, and its language, and the result
  // to update the workspace result
  async updateFile({
    workspaceName,
    absolutePath,
    language,
  }: {
    workspaceName: string;
    absolutePath: string;
    language: string;
  }) {
    // we do not use languageId, we use our own language
    // but the input function could use languageID
    // cause we get it directly from vscode
    // if (!(workspaceName in this.statistics)) {
    //   this.addWorkspace(workspaceName);
    // }
    // const workspace = this.statistics[workspaceName];

    this.addLanguage({ workspaceName, language });

    // calculate the result
    // FileCounter should take this responsibility
    const content = await fs.readFile(absolutePath, { encoding: "utf8" });
    // then make analyzer
    const analyzer = newAnalyzer({
      text: content,
      languageId: language,
    });
    if (analyzer === null) {
      return;
    }
    // count the lines
    let result = analyzer.analyze();
    if (result === null) {
      return;
    }

    // if (!(relativeFilePath in workspace)) {
    //   workspace[relativeFilePath] = {};
    // }
    this.statistics[workspaceName][language][absolutePath] = result;
  }

  // get the statistic of a certain file
  // async getStatistics({
  //   workspaceFolder,
  //   text,
  //   languageId,
  //   relativePath,
  // }: {
  //   workspaceFolder?: vscode.WorkspaceFolder;
  //   languageId: string;
  //   text: string;
  //   relativePath: string;
  // }): Promise<{
  //   result?: FileResult;
  //   totalCodes?: number;
  //   totalComments?: number;
  // }> {
  //   let totalCodes = 0;
  //   let totalComments = 0;
  //   let result = undefined;

  //   // if (workspace in this.statistics) {
  //   //   for (const [file, result] of Object.entries(
  //   //     this.statistics[language][workspace]
  //   //   )) {
  //   //     totalCodes += result.codes;
  //   //     totalComments += result.comments;
  //   //   }
  //   // }

  //   // if no workspace, we do not need to analyze
  //   if (!workspaceFolder) {
  //     return {};
  //   }

  //   // check if we need to initialize the workspace
  //   const language = toSupportedLanguage({ languageId });
  //   if (!language) {
  //     return {};
  //   }

  //   // 不对，首先是，如果我们的workspace没有被初始化
  //   // 如果该语言没有被初始化
  //   // 如果该文件没有被初始化
  //   // 那么我们就需要初始化
  //   if (
  //     !(workspaceFolder.name in this.statistics) ||
  //     !(language in this.statistics[workspaceFolder.name]) ||
  //     // 最后一条应该是不需要的
  //     // 只有在没有这个language的情况下，我们才initialize整个workspace
  //     // 在initialize之后，我们认为workspace已经被初始化了
  //     !(relativePath in this.statistics[workspaceFolder.name][language])
  //   ) {
  //     console.log("need to inizialize workspace");
  //     vscode.window.showInformationMessage("need to initialize workspace");

  //     await this.statistic({ workspace: workspaceFolder, language });
  //   }

  //   // 如果在初始化完成之后，仍然没有当前文件，那么我们应该分析当前文件
  //   // 并更新workspace的统计

  //   // sum the total codes and comments
  //   for (const [file, result] of Object.entries(
  //     this.statistics[workspaceFolder.name][language]
  //   )) {
  //     totalCodes += result.codes;
  //     totalComments += result.comments;
  //   }
  //   return {
  //     result: this.statistics[workspaceFolder.name][language][relativePath],
  //     totalCodes,
  //     totalComments,
  //   };

  //   // const analyzer = makeAnalyzer({
  //   //   text: text,
  //   //   languageId: languageId,
  //   // });
  //   // if (!analyzer) {
  //   //   return { totalCodes, totalComments };
  //   // }

  //   // result = analyzer.analyze();
  //   // if (!result) {
  //   //   return { totalCodes, totalComments };
  //   // }

  //   // return { result, totalCodes, totalComments };
  // }

  // 提供一个函数，返回某个文件的结果
  // 不是，还是提供一些函数吧
  // handle写在extension入口那里
  getFileResultOnlyLookTable({
    workspaceName,
    language,
    absolutePath,
  }: {
    workspaceName: string;
    language: string;
    absolutePath: string;
  }): FileResult | undefined {
    if (
      workspaceName in this.statistics &&
      language in this.statistics[workspaceName] &&
      absolutePath in this.statistics[workspaceName][language]
    ) {
      return this.statistics[workspaceName][language][absolutePath];
    }
    return undefined;
  }

  // 或许这些函数不应该暴露出来
  // 我们直接提供几个动作的的接口函数
  // extension只需要直接调用即可
  // 命名保持含义就ok
  getTotalCodesAndComments({
    workspaceName,
    language,
  }: {
    workspaceName: string;
    language: string;
  }): {
    totalCodes: number;
    totalComments: number;
  } {
    let totalCodes = 0;
    let totalComments = 0;

    for (const fileResult of Object.values(
      this.statistics[workspaceName][language],
    )) {
      totalCodes += fileResult.codes;
      totalComments += fileResult.comments;
    }
    return { totalCodes, totalComments };
  }

  // statistic of the whole workspace of a cetrain language
  // async statistic({
  //   workspace,
  //   language,
  // }: {
  //   workspace: vscode.WorkspaceFolder;
  //   language: string;
  // }): Promise<void> {
  //   // 遍历我们支持的语言
  //   // 为了尽可能加快加载速度
  //   // 对所有语言的分析都应该是lazy的
  //   // 也就是说我们应该支持某个worksapce的某个语言的分析
  //   // TODO：
  //   // 我还需要维护gitignore文件 当保存文件的时候还需要分析gitignore带来的影响
  // }

  async triggerStatistic({
    workspaceFolder,
    language,
  }: {
    workspaceFolder: vscode.WorkspaceFolder;
    language: string;
  }): Promise<boolean> {
    // what if we just save the path, not the relative path
    // and only git-ignore use the relative path
    // in this way, our code is more coherent, the performance and memory cost is little
    // 最后一条应该是不需要的
    // 只有在没有这个language的情况下，我们才initialize整个workspace
    // 在initialize之后，我们认为workspace已经被初始化了
    // !(path in this.statistics[workspaceFolder.name][language])
    if (
      workspaceFolder.name in this.statistics &&
      language in this.statistics[workspaceFolder.name]
    ) {
      return false;
    }

    const folderCounter = new FolderCounter({
      folder: workspaceFolder,
      language,
      filter: await getGitIgnoreFilter({ workspace: workspaceFolder }),
    });

    const results = await folderCounter.countFolder();
    this.addLanguage({ workspaceName: workspaceFolder.name, language });
    this.statistics[workspaceFolder.name][language] = results;
    return true;
  }

  deleteWorkspace({ workspaceName }: { workspaceName: string }) {
    if (workspaceName in this.statistics) {
      delete this.statistics[workspaceName];
    }
  }
}
