// 2024/7/16
// zhangzhong

import { SupportedLanguage } from "../common/supported-languages";
import { FolderResult } from "../common/types";
import { filterManager } from "../filter/filter-manager";

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

    for (const absolutePath of await filter.getFilteredFiles({
      workspacePath: this.workspacePath,
      language: this.language,
    })) {
      const fileCounter = new FileCounter({
        language: this.language,
        absolutePath,
      });

      const fileResult = await fileCounter.countFile();
      if (fileResult === undefined) {
        continue;
      }
      this.folderResult[absolutePath] = fileResult;
    }
    return this.folderResult;
  }
}
