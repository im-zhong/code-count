// 2024/7/8
// zhangzhong

import { SupportedLanguage } from "../common/supported-languages";

import { Analyzer } from "./base-analyzer";
import { CppAnalyzer } from "./cpp-analyzer";
import { PyAnalyzer } from "./py-analyzer";
import { TsAnalyzer } from "./ts-analyzer";

export function newAnalyzer({
  text,
  language,
}: {
  text: string;
  language: SupportedLanguage;
}): Analyzer | undefined {
  switch (language) {
    case SupportedLanguage.PYTHON:
      return new PyAnalyzer({ text });
    case SupportedLanguage.TYPE_SCRIPT:
      return new TsAnalyzer({ text });
    case SupportedLanguage.CPP:
      return new CppAnalyzer({ text });
    default:
      return undefined;
  }
}
