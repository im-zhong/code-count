// 2024/7/8
// zhangzhong

import { FileResult, LineClass } from "../common/types";
import { BitVector } from "../lib/bit-vector";
import { StringStream } from "../lib/string-stream";
import { isSpace } from "../lib/string-utils";

export abstract class Analyzer {
  protected lineBegin: number;
  protected lineEnd: number;
  private lineCommentHead: string;
  private blockCommentHead: string;
  private blockCommentTail: string;
  private lineClasses: BitVector[]; // use an array to store the class of each line
  protected stringStream: StringStream;

  constructor({
    lineCommentHead,
    blockCommentHead,
    blockCommentTail,
    text,
  }: {
    lineCommentHead: string;
    blockCommentHead: string;
    blockCommentTail: string;
    text: string;
  }) {
    this.lineBegin = 0;
    this.lineEnd = 0;
    this.lineCommentHead = lineCommentHead;
    this.blockCommentHead = blockCommentHead;
    this.blockCommentTail = blockCommentTail;
    this.lineClasses = [];
    this.stringStream = new StringStream(text);
  }

  analyze(): FileResult | undefined {
    try {
      this.init();

      let offset = 0;
      while (this.getLineAndResetOffset() !== null) {
        while (
          (offset = this.findFirstNotBlank(
            this.stringStream.getCurrentLine(),
            this.stringStream.getCurrentOffset(),
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
              lineNo: this.lineBegin,
              lineClass: LineClass.Code,
            });
            this.stringStream.addToCurrentOffset(1);
          }
        }
        // to the next line
        this.lineBegin = this.lineEnd;
      }

      return this.lineClassestoResult({ lineClasses: this.lineClasses });
    } catch (e) {
      return undefined;
    }
  }

  lineClassestoResult({
    lineClasses,
  }: {
    lineClasses: BitVector[];
  }): FileResult {
    const result: FileResult = {
      lines: lineClasses.length,
      codes: 0,
      comments: 0,
      lineClasses: [],
    };

    let isCode = false;
    let isComment = false;
    for (let i = 0; i < lineClasses.length; i++) {
      const lineClass = lineClasses[i];
      isCode = false;
      isComment = false;

      if (
        lineClass.testBit(LineClass.LineComment) ||
        lineClass.testBit(LineClass.BlockComment)
      ) {
        isComment = true;
        result.comments++;
      }
      if (lineClass.testBit(LineClass.Code)) {
        isCode = true;
        result.codes++;
      }

      if (isCode && isComment) {
        result.lineClasses.push(LineClass.CodeComment);
      } else if (isCode) {
        result.lineClasses.push(LineClass.Code);
      } else if (isComment) {
        result.lineClasses.push(LineClass.Comment);
      } else {
        result.lineClasses.push(LineClass.Blank);
      }
    }
    return result;
  }

  getLineAndResetOffset(): string | null {
    if (this.stringStream.getNextLine() !== null) {
      this.lineEnd++;
      this.lineClasses.push(new BitVector());
      return this.stringStream.getCurrentLine();
    }
    return null;
  }

  findFirstNotBlank(line: string, offset: number): number {
    for (let i = offset; i < line.length; i++) {
      if (!isSpace(line[i])) {
        return i;
      }
    }
    return -1;
  }

  init(): void {
    this.lineBegin = 0;
    this.lineEnd = 0;
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
    for (let i = lineBegin; i < lineEnd; i++) {
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

  // all skip function should set the current offset correctly
  // before call this function, make sure you already skip the head of the delimiter
  skipUntilFindDelimiter({
    firstSkipLength,
    delimiter,
    lineClass,
  }: {
    firstSkipLength: number;
    delimiter: string;
    lineClass: LineClass;
  }) {
    // skip the head of the delimiter first
    this.stringStream.addToCurrentOffset(firstSkipLength);

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
    // first skip the first delimiter: ' or "
    this.stringStream.addToCurrentOffset(delimiter.length);

    let isFoundDelimiter = false;
    let offset = -1;
    while (
      (offset = this.stringStream
        .getCurrentLine()
        .indexOf(delimiter, this.stringStream.getCurrentOffset())) !== -1
    ) {
      // whatever, we need to pass the found delimiter
      this.stringStream.setCurrentOffset(offset + delimiter.length);

      // then check if it is a escape sequence, if not, we find the end of the string
      if (!this.isFoundEscapeSequence({ backLength: delimiter.length + 1 })) {
        isFoundDelimiter = true;
        break;
      }
    }

    if (!isFoundDelimiter) {
      throw new Error("string not closed");
    }

    this.setLineClass({
      lineNo: this.lineBegin,
      lineClass: LineClass.Code,
    });
  }

  isFoundEscapeSequence({ backLength }: { backLength: number }): boolean {
    // Look back to find and count backslashes
    let currentIdx = this.stringStream.getCurrentOffset() - backLength;
    if (currentIdx < 0) {
      return false;
    }

    let slashSize = 0;
    while (
      currentIdx >= 0 &&
      this.stringStream.getCurrentLine()[currentIdx] === "\\"
    ) {
      ++slashSize;
      --currentIdx;
    }
    // If slashSize is even, then it is not an escape sequence
    // and we find the end of the string, make offset point to the
    // next position of delimiter
    return slashSize % 2 !== 0;
  }

  skipRawString() {
    // raw string: r"..."
    // offset -> r, but r should not count as a part of raw string
    const rawStringHead = this.stringStream
      .getCurrentLine()
      .slice(
        this.stringStream.getCurrentOffset() + 1,
        this.stringStream.getCurrentOffset() + 2,
      );
    const rawStringTail = rawStringHead;

    this.skipUntilFindDelimiter({
      firstSkipLength: 1 + rawStringHead.length,
      delimiter: rawStringTail,
      lineClass: LineClass.Code,
    });
  }

  skipLineComment() {
    // deal with '\' at the end of line
    while (this.stringStream.getCurrentLine().slice(-1) === "\\") {
      this.getLineAndResetOffset();
    }

    this.stringStream.setCurrentOffset(-1);
    this.setMultiLineClass({
      lineBegin: this.lineBegin,
      lineEnd: this.lineEnd,
      lineClass: LineClass.LineComment,
    });
    this.lineBegin = this.lineEnd - 1;
  }

  skipBlockComment() {
    this.skipUntilFindDelimiter({
      firstSkipLength: this.blockCommentHead.length,
      delimiter: this.blockCommentTail,
      lineClass: LineClass.BlockComment,
    });
  }
}
