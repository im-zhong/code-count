// 2024/7/8
// zhangzhong

import { Result, LineClass } from "./types";
import { BitVector } from "./bit-vector";
import { delimiter } from "path";

// 这个东西就代表着一个字符串流
// 在其之上，我们封装一些常用的操作
// 比如 getline

class StringStream {
  private text: string;
  private offset: number;
  // private currentLine: string;
  private lines: string[];
  private currentLine: number;

  constructor(text: string) {
    this.text = text;
    this.offset = 0;
    this.currentLine = -1;
    this.lines = text.split("\n");
  }

  // 这个应该改成getNextLine
  getNextLine(): string | null {
    this.currentLine++;
    if (this.currentLine >= this.lines.length) {
      return null;
    }
    this.offset = 0;
    return this.lines[this.currentLine];
  }

  getCurrentLine(): string {
    // TODO：这里应该抛出一个异常
    if (this.currentLine === -1) {
      this.currentLine++;
    }
    return this.lines[this.currentLine];
  }

  // 一个比较麻烦的点在于我们在每次分析完一些东西之后
  // 需要手动设置这个offset
  getCurrentOffset(): number {
    return this.offset;
  }

  // 设置新的值并返回新的值
  setCurrentOffset(offset: number): number {
    this.offset = offset;
    return offset;
  }

  addToCurrentOffset(offset: number): number {
    this.offset += offset;
    return this.offset;
  }

  getCurrentCharacter(): string {
    return this.getCurrentLine()[this.offset];
  }
}

function isSpace(char: string): boolean {
  return /\s/.test(char);
}

// 我们有必要区分两种注释吗？
// type LineClass = "code" | "line-comment" | "blank" | "block-comment";

abstract class Analyzer {
  private result?: Result;
  private lineBegin: number;
  private lineEnd: number;
  private lineCommentHead: string;
  private blockCommentHead: string;
  private blockCommentTail: string;
  private stringStream: StringStream;
  private offset: number;
  // 我们需要一个数组用来保存每一行的类别
  private lineClasses: BitVector[];

  // 我们需要给每一行都标上category
  // 最简单的方式就是使用vector

  constructor(
    lineCommentHead: string,
    blockCommentHead: string,
    blockCommentTail: string,
    text: string
  ) {
    this.result = undefined;
    this.lineBegin = 0;
    this.lineEnd = 0;
    this.lineCommentHead = lineCommentHead;
    this.blockCommentHead = blockCommentHead;
    this.blockCommentTail = blockCommentTail;
    this.offset = 0;
    this.lineClasses = [];
    this.stringStream = new StringStream(text);
  }

  analyze(): Result {
    this.init();

    let offset = 0;
    while (this.getLineAndResetOffset()) {
      while (
        (offset = this.findFirstNotBlank(
          this.stringStream.getCurrentLine(),
          this.stringStream.getCurrentOffset()
        )) !== -1
      ) {
        this.stringStream.setCurrentOffset(offset);
        if (this.isStringHead()) {
          this.skipString();
        } else if (this.isRawStringHead()) {
          this.skipRawString();
        } else if (this.isLineCommentHead()) {
          this.skipLineComment();
        } else if (this.isBlockCommentHead()) {
          this.skipBlockComment();
        } else {
          this.setLineClass({
            lineNo: this.lineEnd,
            lineClass: LineClass.Code,
          });
          this.stringStream.addToCurrentOffset(1);
        }
      }
      // 为什么要加这一句话？
      this.lineBegin = this.lineEnd;
    }
    return this.result!;
  }

  // TODO: 修改成使用stringStream
  getLineAndResetOffset(): string | null {
    const line = this.stringStream.getNextLine();
    this.lineClasses.push(new BitVector());
    return line;
  }

  findFirstNotBlank(line: string, offset: number): number {
    for (let i = offset; i < line.length; i++) {
      if (!isSpace(line[i])) {
        return offset;
      }
    }
    return -1;
  }

  init(): void {
    this.lineBegin = 0;
    this.lineEnd = 0;
    this.result = undefined;
  }

  setLineClass({
    lineNo,
    lineClass,
  }: {
    lineNo: number;
    lineClass: LineClass;
  }) {
    this.lineClasses[lineNo].setBit(lineClass);
  }

  setMultiLineClass({
    lineBegin,
    lineEnd,
    lineClass,
  }: {
    lineBegin: number;
    lineEnd: number;
    lineClass: LineClass;
  }) {
    for (let i = lineBegin; i <= lineEnd; i++) {
      this.setLineClass({ lineNo: i, lineClass });
    }
  }

  isStringHeadImpl({
    line,
    offset,
  }: {
    line: string;
    offset: number;
  }): boolean {
    return line[offset] === '"' || line[offset] === "'";
  }
  // 要不就直接使用全局状态吧
  // 这样代码更加统一一点
  isStringHead(): boolean {
    const line = this.stringStream.getCurrentLine();
    const offset = this.stringStream.getCurrentOffset();
    return this.isStringHeadImpl({ line, offset });
  }

  isRawStringHead(): boolean {
    const line = this.stringStream.getCurrentLine();
    const offset = this.stringStream.getCurrentOffset();
    if (line[offset] === "r" || line[offset] === "R") {
      if (this.isStringHeadImpl({ line, offset: offset + 1 })) {
        // the character before r must be a blank or at the front the line
        // i.e. operator"" is not raw string head
        if (offset === 0 || isSpace(line[offset - 1])) {
          return true;
        }
      }
    }
    return false;
  }

  isLineCommentHead(): boolean {
    const line = this.stringStream.getCurrentLine();
    const offset = this.stringStream.getCurrentOffset();
    return (
      line.slice(offset, offset + this.lineCommentHead.length) ===
      this.lineCommentHead
    );
  }

  isBlockCommentHead(): boolean {
    const line = this.stringStream.getCurrentLine();
    const offset = this.stringStream.getCurrentOffset();
    return (
      line.slice(offset, offset + this.blockCommentHead.length) ===
      this.blockCommentHead
    );
  }

  skipUntilFindDelimiter({
    delimiter,
    lineClass,
  }: {
    delimiter: string;
    lineClass: LineClass;
  }) {
    // 我们使用StringStream来保存当前的状态
    // text 表示当前正在分析的所有文本
    // currentLine 表示当前正在分析的行
    // currentLineNo 表示当前正在分析的行号
    // currentOffset 表示当前正在分析的行的偏移量
    // 我们需要始终在一个全局变量中保存currentLine，currentOffset

    let offset = 0;
    while (
      (offset = this.stringStream
        .getCurrentLine()
        .indexOf(delimiter, this.stringStream.getCurrentOffset())) === -1
    ) {
      this.getLineAndResetOffset();
    }
    this.stringStream.setCurrentOffset(offset + delimiter.length);

    this.setMultiLineClass({
      lineBegin: this.lineBegin,
      lineEnd: this.lineEnd,
      lineClass,
    });
    this.lineBegin = this.lineEnd - 1;
  }

  skipString() {
    const delimiter = this.stringStream.getCurrentCharacter();
    let isFindDelimiter = false;
    let currentIdx = 0;
    let slashSize = 0;
    let offset = 0;

    while (true) {
      currentIdx = 0;
      slashSize = 0;
      offset = this.stringStream
        .getCurrentLine()
        .indexOf(
          delimiter,
          this.stringStream.getCurrentOffset() + delimiter.length
        );

      while (offset < this.stringStream.getCurrentLine().length) {
        currentIdx = offset - 1;
        slashSize = 0;
        // Look back to find and count backslashes
        while (
          this.stringStream.getCurrentLine()[currentIdx] === "\\" &&
          currentIdx >= 0
        ) {
          ++slashSize;
          --currentIdx;
        }

        if (slashSize % 2 === 0) {
          // If slashSize is even, then it is not an escape sequence
          // and we find the end of the string, make offset point to the
          // next position of delimiter
          ++offset;
          isFindDelimiter = true;
          break;
        } else {
          // Otherwise, it is an escape sequence
          // and we need to find the next delimiter at the next position
          offset = this.stringStream
            .getCurrentLine()
            .indexOf(delimiter, offset + delimiter.length);
        }
      }
      this.stringStream.setCurrentOffset(offset);

      if (isFindDelimiter) {
        break;
      }

      // If we reach here, it means we cannot find the delimiter in this line
      // Assuming GetLineAndResetOffset is an async method that fetches the next line
      // and resets the offset. This method needs to be defined elsewhere.
      if (!this.getLineAndResetOffset()) {
        break;
      }
    }

    this.setMultiLineClass({
      lineBegin: this.lineBegin,
      lineEnd: this.lineEnd,
      lineClass: LineClass.Code,
    });
    this.lineBegin = this.lineEnd - 1;
  }

  skipRawString() {
    // raw string: r"..."
    // offset -> r, but r should not count as a part of raw string
    const rawStringHead = this.stringStream
      .getCurrentLine()
      .slice(
        this.stringStream.getCurrentOffset() + 1,
        this.stringStream.getCurrentOffset() + 2
      );

    // TODO: 对raw string的处理或许可以写的更通用一点
    // 目前应该只能处理 r'' r"" 这样的情况
    const rawStringTail = rawStringHead;

    this.skipUntilFindDelimiter({
      delimiter: rawStringTail,
      lineClass: LineClass.Code,
    });
  }

  skipLineComment() {
    // deal with '\' at the end of line
    while (this.stringStream.getCurrentLine().slice(-1) === "\\") {
      this.getLineAndResetOffset();
    }

    this.setMultiLineClass({
      lineBegin: this.lineBegin,
      lineEnd: this.lineEnd,
      lineClass: LineClass.LineComment,
    });
    this.lineBegin = this.lineEnd - 1;
  }

  skipBlockComment() {
    this.stringStream.setCurrentOffset(
      this.stringStream.getCurrentOffset() + this.blockCommentHead.length
    );
    this.skipUntilFindDelimiter({
      delimiter: this.blockCommentTail,
      lineClass: LineClass.BlockComment,
    });
  }
}
