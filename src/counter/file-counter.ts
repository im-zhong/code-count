// 2024/7/24
// zhangzhong

import * as fs from "fs/promises";

import { newAnalyzer } from "../analyzer/factory";
import { FileResult } from "../common/types";

export class FileCounter {
  private language: string;
  private absolutePath: string;

  constructor({
    language,
    absolutePath,
  }: {
    language: string;
    absolutePath: string;
  }) {
    this.language = language;
    this.absolutePath = absolutePath;
  }

  async countFile(): Promise<FileResult | undefined> {
    // first read the file
    const content = await fs.readFile(this.absolutePath, { encoding: "utf8" });
    // then make analyzer
    const analyzer = newAnalyzer({
      text: content,
      languageId: this.language,
    });
    if (analyzer === null) {
      return undefined;
    }
    // count the lines
    let result = analyzer.analyze();
    if (result === null) {
      return undefined;
    }
    return result;
  }
}
