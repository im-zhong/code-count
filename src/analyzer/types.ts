export enum LineClass {
  Blank,
  Code,
  LineComment,

  BlockComment,
  CodeComment,
  Comment,
}

export interface Result {
  file: string;
  all: number;
  codes: number;
  comments: number;
  lineClasses: LineClass[];
}

// BitVector =>
