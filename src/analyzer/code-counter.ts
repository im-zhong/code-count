// 2024/7/8
// zhangzhong

interface Result {
  file: string;
  all: number;
  codes: number;
  comments: number;
}

export function countCode({
  text,
  language,
}: {
  text: string;
  language: string;
}): Result {
  return {
    file: "test",
    all: 0,
    codes: 0,
    comments: 0,
  } satisfies Result;
}
