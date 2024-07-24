// 2024/7/17
// zhangzhong

// C and C++ should be one language
// and we set the suffix of c and c++
export const SUPPORTED_LANGUAGES = [
  // "c",
  "cpp",
  "python",
  "typescript",
  // "objective-cpp",
  //   "typescriptreact",
  //   "javascript",
  //   "javascriptreact",
];

export const CPP_SUFFIXES = [
  // C
  ".c",
  ".h",
  ".h.in",
  // C++
  ".cc",
  ".hh",
  ".cpp",
  ".hpp",
  ".cxx",
  ".hxx",
  ".c++",
  ".h++",
];

// const OBJECTIVE_SUFFIXES = [
//   // Objective-C
//   ".m",
//   // Objective-C++
//   ".mm",
// ];

export const TS_SUFFIXES = [".ts", ".tsx", "js", "jsx", "mjs", "mts"];

export const PY_SUFFIXES = [".py", ".py.in"];

export const supported_suffixes: { [key: string]: string[] } = {
  cpp: CPP_SUFFIXES,
  python: PY_SUFFIXES,
  typescript: TS_SUFFIXES,
};

// from languageId to support language
export function toSupportedLanguage({
  languageId,
}: {
  languageId: string;
}): string {
  if (languageId === "c" || languageId === "cpp") {
    return "cpp";
  }
  if (languageId === "python") {
    return "python";
  }
  if (
    languageId === "typescript" ||
    languageId === "javascript" ||
    languageId === "typescriptreact" ||
    languageId === "javascriptreact"
  ) {
    return "typescript";
  }
  throw new Error(`Unsupported languageId: ${languageId}`);
}

export function getSupportedLanguageFromPath({
  path,
}: {
  path: string;
}): string | undefined {
  // 或许可以使用glob来进行判断
  // 或者使用匹配
  for (const suffix of CPP_SUFFIXES) {
    if (path.endsWith(suffix)) {
      return "cpp";
    }
  }

  for (const suffix of PY_SUFFIXES) {
    if (path.endsWith(suffix)) {
      return "python";
    }
  }

  for (const suffix of TS_SUFFIXES) {
    if (path.endsWith(suffix)) {
      return "typescript";
    }
  }

  return undefined;
}
