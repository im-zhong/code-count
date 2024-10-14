// 2024/7/8
// zhangzhong

import { SupportedLanguage } from "../common/supported-languages";

import { Analyzer } from "./base-analyzer";
import { CppAnalyzer } from "./cpp-analyzer";
import { CSharpAnalyzer } from "./csharp-analyzer";
import { GDSAnalyzer } from "./gdscript-analyzer";
import { PyAnalyzer } from "./py-analyzer";
import { TsAnalyzer } from "./ts-analyzer";

export function newAnalyzer({
  text,
  language,
  absolutePath,
}: {
  text: string;
  language: SupportedLanguage;
  absolutePath: string;
}): Analyzer | undefined {
  switch (language) {
    case SupportedLanguage.PYTHON:
      return new PyAnalyzer({ text, absolutePath });
    case SupportedLanguage.TYPE_SCRIPT:
      return new TsAnalyzer({ text });
    case SupportedLanguage.CPP:
      return new CppAnalyzer({ text });
    case SupportedLanguage.GDSCRIPT:
      return new GDSAnalyzer({ text, absolutePath });
    case SupportedLanguage.CSHARP:
      return new CSharpAnalyzer({ text });
    default:
      return undefined;
  }
}
