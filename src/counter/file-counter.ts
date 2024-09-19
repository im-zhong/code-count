// 2024/7/24
// zhangzhong

import * as fs from "fs/promises";

import { newAnalyzer } from "../analyzer/factory";
import { SupportedLanguage } from "../common/supported-languages";
import { FileResult } from "../common/types";
import { printToChannelOutput } from "../lib/output-channel";

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
    try {
      printToChannelOutput(`Start counting: ${this.absolutePath}`);

      const text = await fs.readFile(this.absolutePath, { encoding: "utf8" });
      const result = newAnalyzer({
        text,
        language: this.language,
        absolutePath: this.absolutePath,
      })?.analyze();

      printToChannelOutput(`End counting: ${this.absolutePath}`);
      return result;
    } catch (error) {
      printToChannelOutput(
        `Failed counting: ${this.absolutePath}, error: ${error}`,
      );
      return undefined;
    }
  }
}
