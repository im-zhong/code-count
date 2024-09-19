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

      // 应该在这里添加日志吧
      // 之后读取已经分析好的结果，也不需要日志啊
      // 而且不管是最开是的count workspace 还是之后的save file update file 都是走这个
      // console.log(`Start counting: ${this.absolutePath}`);

      const result = newAnalyzer({
        text,
        language: this.language,
        absolutePath: this.absolutePath,
      })?.analyze();
      // console.log(`End counting: ${this.absolutePath}`);
      printToChannelOutput(`End counting: ${this.absolutePath}`);
      return result;
    } catch (error) {
      // console.error(`Error counting file: ${this.absolutePath}`);
      // console.error(error);
      printToChannelOutput(`Failed counting: ${this.absolutePath}`);
      return undefined;
    }
  }
}
