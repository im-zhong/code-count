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

export const PY_SUFFIXES = [".py"];

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
  return SUPPORTED_LANGUAGES.find((language) =>
    path.endsWith(CPP_SUFFIXES.map((suffix) => suffix).join("|"))
  );
}
