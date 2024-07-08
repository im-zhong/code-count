// 2024/7/8
// zhangzhong

import { Result, LineClass } from "./types";
import { BitVector } from "./bit-vector";
import { Analyzer } from "./interface";

export class TsAnalyzer extends Analyzer {
  constructor({ text }: { text: string }) {
    super({
      lineCommentHead: "//",
      blockCommentHead: "/*",
      blockCommentTail: "*/",
      text,
    });
  }
}