// 2024/7/8
// zhangzhong
// https://code.visualstudio.com/docs/languages/identifiers

import { Result } from "./types";
import { Analyzer } from "./interface";
import { PyAnalyzer } from "./py-analyzer";
import { TsAnalyzer } from "./ts-analyzer";

// make the analyzer
export function makeAnalyzer({
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
      languageId
    )
  ) {
    return new TsAnalyzer({ text });
  }

  return null;
}
