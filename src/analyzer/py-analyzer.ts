// 2024/7/8
// zhangzhong

import { Analyzer } from "./interface";
import { LineClass } from "./types";

export class PyAnalyzer extends Analyzer {
  constructor({ text }: { text: string }) {
    super({
      lineCommentHead: "#",
      blockCommentHead: "",
      blockCommentTail: "",
      text,
    });
  }

  // overload the block comment check method
  // cause python do not has block comment

  isBlockCommentHead(): boolean {
    return false;
  }

  skipBlockComment(): void {}

  // in python, raw string could be r' r" r""" r''' etc.
  isRawStringHead(): boolean {
    const line = this.stringStream.getCurrentLine();
    const offset = this.stringStream.getCurrentOffset();
    return (
      line.slice(offset, offset + 2) === "r'" ||
      line.slice(offset, offset + 2) === 'r"' ||
      line.slice(offset, offset + 4) === 'r"""' ||
      line.slice(offset, offset + 4) === "r'''"
    );
  }

  skipRawString(): void {
    // determine the raw string head is r' or r" or r''' or r"""
    const line = this.stringStream.getCurrentLine();
    const offset = this.stringStream.getCurrentOffset();
    let delimiterLength = 1;
    if (
      line.slice(offset, offset + 4) === "r'''" ||
      line.slice(offset, offset + 4) === 'r"""'
    ) {
      delimiterLength = 3;
    }

    // raw string: r"..."
    // offset -> r, but r should not couat as a part of raw string
    const delimiter = line.slice(offset + 1, offset + 1 + delimiterLength);
    this.skipUntilFindDelimiter({ delimiter, lineClass: LineClass.Code });
  }
}
