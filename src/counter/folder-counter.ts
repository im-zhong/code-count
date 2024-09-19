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
    // there is a loading icon in vscode icons
    // and a spin operator can spin it, we are loading!
    // now the problem is that we need show the loading status bar
    // the eaist way to do this is create a new status bar item
    // and only show it when we count the workspace
    // and we show the other status bar item when we finish counting
    // this status bar item is better to write as a single module

    // almost right
    // Code Counting: 1234 rest
    const loadingStatusBarItem = getLoadingStatusBarItem();
    loadingStatusBarItem.show();

    // collecting files first
    loadingStatusBarItem.text = `$(loading~spin) code-count: collecting files of ${this.language}`;
    const filteredFiles = await filter.getFilteredFiles({
      workspacePath: this.workspacePath,
      language: this.language,
    });

    let totalFilesCount = filteredFiles.length;
    loadingStatusBarItem.text = `$(loading~spin) code-count: ${totalFilesCount} file(s) remains`;

    for (const absolutePath of filteredFiles) {
      const fileCounter = new FileCounter({
        language: this.language,
        absolutePath,
      });

      const fileResult = await fileCounter.countFile();
      if (fileResult !== undefined) {
        // now this contnue is not correct
        // continue;
        this.folderResult[absolutePath] = fileResult;
      }

      // update too frequently is not good
      // how to update the text more smoothly and interestingly?
      if (totalFilesCount % 10 === 0) {
        loadingStatusBarItem.text = `$(loading~spin) code-count: ${totalFilesCount} file(s) remains`;
      }
      totalFilesCount -= 1;
    }

    loadingStatusBarItem.hide();
    return this.folderResult;
  }
}
