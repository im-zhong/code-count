// 2024/7/16
// zhangzhong

import { SupportedLanguage } from "../common/supported-languages";
import { FolderResult } from "../common/types";
import { filterManager } from "../filter/filter-manager";
import { getLoadingStatusBarItem } from "../lib/loading-status-bar-item";

import { FileCounter } from "./file-counter";

export class FolderCounter {
  private workspacePath: string;
  private language: SupportedLanguage;
  private folderResult: FolderResult;

  constructor({
    workspacePath,
    language,
  }: {
    workspacePath: string;
    language: SupportedLanguage;
  }) {
    this.workspacePath = workspacePath;
    this.language = language;
    this.folderResult = {};
  }

  async countFolder(): Promise<FolderResult> {
    this.folderResult = {};
    const filter = await filterManager.getFilter({
      workspacePath: this.workspacePath,
    });

    // https://stackoverflow.com/questions/55633453/rotating-octicon-in-statusbar-of-vs-code
    const loadingStatusBarItem = getLoadingStatusBarItem();
    loadingStatusBarItem.text = `$(loading~spin) code-count: collecting ${this.language} files`;
    loadingStatusBarItem.show();

    // collecting files that need to be counted
    const filteredFiles = await filter.getFilteredFiles({
      workspacePath: this.workspacePath,
      language: this.language,
    });

    let totalFilesCount = filteredFiles.length;
    loadingStatusBarItem.text = `code-count: ${totalFilesCount} ${this.language} files remaining`;

    for (const absolutePath of filteredFiles) {
      const fileCounter = new FileCounter({
        language: this.language,
        absolutePath,
      });

      const fileResult = await fileCounter.countFile();
      if (fileResult !== undefined) {
        this.folderResult[absolutePath] = fileResult;
      }

      // update too frequently is not good
      // the loading-spin do not suite for this frequently update manner
      if (totalFilesCount % 10 === 0) {
        loadingStatusBarItem.text = `code-count: ${totalFilesCount} ${this.language} files remaining`;
      }
      totalFilesCount -= 1;
    }

    loadingStatusBarItem.hide();
    return this.folderResult;
  }
}
