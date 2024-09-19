// 2024/7/17
// zhangzhong

export enum SupportedLanguage {
  PYTHON = "python",
  TYPE_SCRIPT = "typescript",
  CPP = "cpp",
  GDSCRIPT = "gdscript",
}

// record construct a type with a set of properties K in enumeration one by one
const supportedLanguageSuffixes: Record<SupportedLanguage, string[]> = {
  [SupportedLanguage.PYTHON]: [".py", ".py.in", ".ipynb"],
  [SupportedLanguage.TYPE_SCRIPT]: [
    // TypeScript
    ".ts",
    ".tsx",
    "mts",
    // JavaScript
    "js",
    "jsx",
    "mjs",
  ],
  [SupportedLanguage.CPP]: [
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
  ],
  [SupportedLanguage.GDSCRIPT]: [".gd"],
};

export function getLanguageSuffixes({
  language,
}: {
  language: SupportedLanguage;
}): string[] {
  return supportedLanguageSuffixes[language];
}

export function getSupportedLanguageFromPath({
  path,
}: {
  path: string;
}): SupportedLanguage | undefined {
  for (const [language, suffixes] of Object.entries(
    supportedLanguageSuffixes,
  )) {
    for (const suffix of suffixes) {
      if (path.endsWith(suffix)) {
        return language as SupportedLanguage;
      }
    }
  }
  return undefined;
}

// https://code.visualstudio.com/api/references/contribution-points#contributes.icons
export function getIconFromSupportedLanguage({
  language,
}: {
  language: SupportedLanguage;
}): string {
  switch (language) {
    case SupportedLanguage.PYTHON:
      return "python-icon";
    case SupportedLanguage.CPP:
      return "cuttlefish-icon";
    case SupportedLanguage.TYPE_SCRIPT:
      return "javascript-icon";
    case SupportedLanguage.GDSCRIPT:
      return "python-icon";
  }
}
