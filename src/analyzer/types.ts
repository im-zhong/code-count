// 2024/7/8
// zhangzhong

export enum LineClass {
  Blank,
  Code,
  LineComment,
  BlockComment,
  CodeComment,
  Comment,
}

export interface Result {
  all: number;
  codes: number;
  comments: number;
  lineClasses: LineClass[];
}
