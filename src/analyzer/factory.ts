// 2024/7/8
// zhangzhong
// https://code.visualstudio.com/docs/languages/identifiers

import { Analyzer } from "./base-analyzer";
import { CppAnalyzer } from "./cpp-analyzer";
import { PyAnalyzer } from "./py-analyzer";
import { TsAnalyzer } from "./ts-analyzer";

// make the analyzer
export function newAnalyzer({
  text,
  languageId,
}: {
  text: string;
  languageId: string;
}): Analyzer | null {
  if (languageId === "python") {
    return new PyAnalyzer({ text });
  }
  if (
    ["typescript", "javascript", "typescriptreact", "javascriptreact"].includes(
      languageId,
    )
  ) {
    return new TsAnalyzer({ text });
  }
  if (["cpp", "c", "objective-c", "objective-cpp"].includes(languageId)) {
    return new CppAnalyzer({ text });
  }
  return null;
}
