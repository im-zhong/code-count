// 2024/7/22
// zhangzhong

import { SupportedLanguage } from "../common/supported-languages";
import { FileResult, WorkspaceResult, FileKey } from "../common/types";

import { FileCounter } from "./file-counter";
import { FolderCounter } from "./folder-counter";

export class WorkspaceCounter {
  private workspaceResults: {
    [workspacePath: string]: WorkspaceResult;
  };

  constructor() {
    this.workspaceResults = {};
  }

  getWorkspaceResults() {
    return this.workspaceResults;
  }

  async countWorkspace({
    workspacePath,
    language,
  }: {
    workspacePath: string;
    language: SupportedLanguage;
  }): Promise<boolean> {
    // only count workspace at the very beginning
    if (
      workspacePath in this.workspaceResults &&
      language in this.workspaceResults[workspacePath]
    ) {
      return false;
    }

    const folderCounter = new FolderCounter({
      workspacePath,
      language,
    });
    const folderResult = await folderCounter.countFolder();
    this.addLanguage({ workspacePath: workspacePath, language });
    this.workspaceResults[workspacePath][language] = folderResult;
    return true;
  }

  getFileResult({
    workspacePath,
    language,
    absolutePath,
  }: FileKey): FileResult | undefined {
    if (
      workspacePath in this.workspaceResults &&
      language in this.workspaceResults[workspacePath] &&
      absolutePath in this.workspaceResults[workspacePath][language]
    ) {
      return this.workspaceResults[workspacePath][language][absolutePath];
    }
    return undefined;
  }

  getTotalCodesAndComments({
    workspacePath,
    language,
  }: {
    workspacePath: string;
    language: SupportedLanguage;
  }): {
    totalCodes: number;
    totalComments: number;
  } {
    let totalCodes = 0;
    let totalComments = 0;

    if (
      workspacePath in this.workspaceResults &&
      language in this.workspaceResults[workspacePath]
    ) {
      for (const fileResult of Object.values(
        this.workspaceResults[workspacePath][language],
      )) {
        totalCodes += fileResult.codes;
        totalComments += fileResult.comments;
      }
    }

    return { totalCodes, totalComments };
  }

  async updateFile({ workspacePath, language, absolutePath }: FileKey) {
    const fileCounter = new FileCounter({
      language,
      absolutePath,
    });
    const fileResult = await fileCounter.countFile();
    if (!fileResult) {
      return;
    }

    this.addLanguage({ workspacePath, language });
    this.workspaceResults[workspacePath][language][absolutePath] = fileResult;
  }

  deleteFile({ workspacePath, language, absolutePath }: FileKey) {
    if (
      workspacePath in this.workspaceResults &&
      language in this.workspaceResults[workspacePath] &&
      absolutePath in this.workspaceResults[workspacePath][language]
    ) {
      delete this.workspaceResults[workspacePath][language][absolutePath];
      if (
        Object.keys(this.workspaceResults[workspacePath][language]).length === 0
      ) {
        delete this.workspaceResults[workspacePath][language];
      }
      if (Object.keys(this.workspaceResults[workspacePath]).length === 0) {
        delete this.workspaceResults[workspacePath];
      }
    }
  }

  addLanguage({
    workspacePath,
    language,
  }: {
    workspacePath: string;
    language: SupportedLanguage;
  }) {
    this.addWorkspace(workspacePath);
    if (!(language in this.workspaceResults[workspacePath])) {
      this.workspaceResults[workspacePath][language] = {};
    }
  }

  addWorkspace(workspacePath: string) {
    if (!(workspacePath in this.workspaceResults)) {
      this.workspaceResults[workspacePath] = {};
    }
  }

  deleteWorkspace({ workspacePath }: { workspacePath: string }) {
    if (workspacePath in this.workspaceResults) {
      delete this.workspaceResults[workspacePath];
    }
  }
}
