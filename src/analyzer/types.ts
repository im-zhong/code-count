export interface Result {
  file: string;
  all: number;
  codes: number;
  comments: number;
}

// 原来如此
const result: Result = {
  file: "test",
  all: 0,
  codes: 0,
  comments: 0,
};

export enum LineClass {
  Code,
  LineComment,
  Blank,
  BlockComment,
}
