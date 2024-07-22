// 2024/7/8
// zhangzhong

import { DetailedResult, LineClass } from "./types";
import { BitVector } from "./bit-vector";

export function isSpace(char: string): boolean {
  return /\s/.test(char);
}

export function lineClassestoResult({
  lineClasses,
}: {
  lineClasses: BitVector[];
}): DetailedResult {
  const result: DetailedResult = {
    all: lineClasses.length,
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
