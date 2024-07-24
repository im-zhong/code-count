// 2024/7/17
// zhangzhong

import * as fs from "fs/promises";
import path from "path";

import { glob } from "glob";
import ignore, { Ignore } from "ignore";

import {
  SupportedLanguage,
  getLanguageSuffixes,
} from "../common/supported-languages";

export class GitIgnoreFilter {
  private ig: Ignore | null = null;

  constructor({ patterns }: { patterns: string }) {
    this.ig = patterns !== "" ? ignore().add(patterns) : null;
  }

  ignores(path: string): boolean {
    if (this.ig === null) {
      return false;
    }
    return this.ig.ignores(path);
  }

  async getFilteredFiles({
    workspacePath,
    language,
  }: {
    workspacePath: string;
    language: SupportedLanguage;
  }): Promise<string[]> {
    const suffixes = getLanguageSuffixes({ language });
    if (!suffixes) {
      return [];
    }

    const patterns = suffixes.map((suffix) =>
      path.join(workspacePath, "**", `*${suffix}`),
    );

    const globFiles = await glob(patterns);
    // each Pathname here should be a relative path to the directory of the gitignore rules.
    // https://github.com/kaelzhang/node-ignore?tab=readme-ov-file#pathname-conventions
    // https://github.com/kaelzhang/node-ignore?tab=readme-ov-file#2-filenames-and-dirnames
    const filteredFiles = globFiles.filter(
      (file) => !this.ignores(path.relative(workspacePath, file)),
    );
    return filteredFiles;
  }
}

export async function newGitIgnoreFilter({
  workspacePath,
}: {
  workspacePath: string;
}) {
  const gitIgnorePath = path.join(workspacePath, ".gitignore");

  let gitIgnoreContent = "";
  if (await isExist({ absolutePath: gitIgnorePath })) {
    gitIgnoreContent = await fs.readFile(gitIgnorePath, {
      encoding: "utf8",
    });
  }
  return new GitIgnoreFilter({ patterns: gitIgnoreContent });
}

async function isExist({
  absolutePath,
}: {
  absolutePath: string;
}): Promise<boolean> {
  try {
    await fs.access(absolutePath, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}
