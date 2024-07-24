// 2024/7/16
// zhangzhong

// https://code.visualstudio.com/api/extension-guides/command
// https://github.com/kaelzhang/node-ignore
// https://github.com/isaacs/node-glob

import * as vscode from "vscode";
import { glob } from "glob";
import ignore, { Ignore } from "ignore";
import path from "path";
import * as fs from "fs/promises";
import { makeAnalyzer } from "../analyzer/factory";
import { SUPPORTED_LANGUAGES } from "../common/support-languages";
import { WorkspaceCounter } from "./workspace-counter";
import { FileResult } from "../analyzer/types";
import { Statistics } from "../common/types";
import { GitIgnoreFilter } from "../filter/git-ignore-filter";
import { FolderResult } from "../common/types";
// const ig = ignore().add(["**/node_modules/**", "**/.git/**"]);
import { FileCounter } from "./file-counter";
// const paths = [
//   ".abc/a.js", // filtered out
//   ".abc/d/e.js", // included
// ];

// ig.filter(paths); // ['.abc/d/e.js']
// ig.ignores(".abc/a.js"); // true

// we could just give the whole file, that's great!
// add(fs.readFileSync(filenameOfGitignore).toString());

// In other words, each Pathname here should be a relative path to the directory of the gitignore rules.
// https://github.com/kaelzhang/node-ignore?tab=readme-ov-file#pathname-conventions
// https://github.com/kaelzhang/node-ignore?tab=readme-ov-file#2-filenames-and-dirnames

export class FolderCounter {
  private statistics: Statistics;
  private folder: vscode.WorkspaceFolder;
  private language: string;
  private filter: GitIgnoreFilter;
  private results: { [key: string]: FileResult };

  constructor({
    folder,
    language,
    filter,
  }: {
    folder: vscode.WorkspaceFolder;
    language: string;
    filter: GitIgnoreFilter;
  }) {
    this.language = language;
    this.filter = filter;
    this.folder = folder;
    this.statistics = {};
    this.results = {};
  }

  async countFolder(): Promise<FolderResult> {
    for (const absolutePath of await this.filter.getAllFiles({
      folder: this.folder.uri.fsPath,
      languageId: this.language,
    })) {
      const fileCounter = new FileCounter({
        language: this.language,
        absolutePath,
      });
      const fileResult = await fileCounter.countFile();
      if (fileResult === undefined) {
        continue;
      }
      // result.file = file;
      // to relative path
      // const relativePath = path.relative(this.folder.uri.fsPath, file);
      this.results[absolutePath] = fileResult;
    }
    return this.results;
  }
}
