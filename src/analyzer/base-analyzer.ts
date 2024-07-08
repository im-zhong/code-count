// 2024/7/8
// zhangzhong

import { Result, LineClass } from "./types";
import { BitVector } from "./bit-vector";
import { StringStream } from "./string-stream";
import { isSpace, lineClassestoResult } from "./common";

export abstract class Analyzer {
  private lineBegin: number;
  private lineEnd: number;
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

  analyze(): Result | null {
    try {
      this.init();

      let offset = 0;
      while (this.getLineAndResetOffset() !== null) {
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
              lineNo: this.lineBegin,
              lineClass: LineClass.Code,
            });
            this.stringStream.addToCurrentOffset(1);
          }
        }
        // to the next line
        this.lineBegin = this.lineEnd;
      }

      return lineClassestoResult({ lineClasses: this.lineClasses });
    } catch (e) {
      return null;
    }
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
  skipUntilFindDelimiter({
    delimiter,
    lineClass,
  }: {
    delimiter: string;
    lineClass: LineClass;
  }) {
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

    this.stringStream.setCurrentOffset(-1);
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
