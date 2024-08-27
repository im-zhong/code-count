// 2024/7/24
// zhangzhong

import * as fs from "fs/promises";

import { newAnalyzer } from "../analyzer/factory";
import { SupportedLanguage } from "../common/supported-languages";
import { FileResult } from "../common/types";

export class FileCounter {
  private language: SupportedLanguage;
  private absolutePath: string;

  constructor({
    language,
    absolutePath,
  }: {
    language: SupportedLanguage;
    absolutePath: string;
  }) {
    this.language = language;
    this.absolutePath = absolutePath;
  }

  async countFile(): Promise<FileResult | undefined> {
    const text = await fs.readFile(this.absolutePath, { encoding: "utf8" });

    return newAnalyzer({
      text,
      language: this.language,
      absolutePath: this.absolutePath,
    })?.analyze();
  }
}
