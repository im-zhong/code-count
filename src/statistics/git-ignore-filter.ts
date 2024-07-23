// 2024/7/17
// zhangzhong

import * as vscode from "vscode";

import { glob } from "glob";
import ignore, { Ignore } from "ignore";
import path from "path";
import * as fs from "fs/promises";
import {
  SUPPORTED_LANGUAGES,
  CPP_SUFFIXES,
  TS_SUFFIXES,
  PY_SUFFIXES,
} from "../conf/support-languages";

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

  async getFilteredPaths({ folder }: { folder: string }): Promise<string[]> {
    const pathes = await fs.readdir(folder, { withFileTypes: true });
    // 实际上这是不对的 我们还要recursive
    // 但是我们要特殊情况特殊分析
    // 应该用最简单的方式来实现
    // 我们分析代码不也是通过文件后缀来判断的吗？
    // 那glob不就是可以直接拿到对应的文件吗？
    // 然后我们再根据gitignore来过滤
    // 这才是最简单的方式啊！！！
    return pathes
      .filter((path) => !this.ignores(path.name))
      .map((path) => path.name);
  }

  // 根据我们支持的语言的后缀，通过glob来查找文件
  // TODO: 你可以看到这里的代码是重复的
  // 我们应该把代表各种语言的后缀给提取出来，甚至可以做成一个配置？
  async getAllCppFiles({ folder }: { folder: string }): Promise<string[]> {
    const patterns = CPP_SUFFIXES.map((suffix) =>
      path.join(folder, "**", `*${suffix}`)
    );

    return (await glob(patterns)).filter((file) => !this.ignores(file));
  }

  async getAllTsFiles({ folder }: { folder: string }): Promise<string[]> {
    // const suffixes = [".ts", ".tsx", "js", "jsx", "mjs", "mts"];
    const patterns = TS_SUFFIXES.map((suffix) =>
      path.join(folder, "**", `*${suffix}`)
    );
    return (await glob(patterns)).filter((file) => !this.ignores(file));
  }

  async getAllPyFiles({ folder }: { folder: string }): Promise<string[]> {
    // const suffixes = [".py"];
    const patterns = PY_SUFFIXES.map((suffix) =>
      path.join(folder, "**", `*${suffix}`)
    );
    return (await glob(patterns)).filter((file) => !this.ignores(file));
  }

  async getAllFiles({
    folder,
    languageId,
  }: {
    folder: string;
    languageId: string;
  }): Promise<string[]> {
    if (languageId === "python") {
      return this.getAllPyFiles({ folder });
    }
    if (
      [
        "typescript",
        "javascript",
        "typescriptreact",
        "javascriptreact",
      ].includes(languageId)
    ) {
      return this.getAllTsFiles({ folder });
    }
    if (["cpp", "c"].includes(languageId)) {
      return this.getAllCppFiles({ folder });
    }
    return [];
  }
}

export async function newGitIgnoreFilter({
  folder,
}: {
  folder: vscode.WorkspaceFolder;
}) {
  let gitIgnoreContent = "";
  const gitignorePath = path.join(folder.uri.fsPath, ".gitignore");
  // check if the file exists
  if (await isExists({ path: gitignorePath })) {
    // count the folder with out pattern
    gitIgnoreContent = await fs.readFile(gitignorePath, {
      encoding: "utf8",
    });
  }

  // 空的竟然是不能用的？
  // 那只能自己包装一个filter了
  const filter = new GitIgnoreFilter({ patterns: gitIgnoreContent });
  return filter;
}

async function isExists({ path }: { path: string }): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}

// 我们需要实现一个单例
// 这个单例需要持续维护一个filter
// 当gitignore文件发生变化时
// 我们的统计数量也要发生变化

export function getGitIgnoreFilter({
  workspace,
}: {
  workspace: vscode.WorkspaceFolder;
}) {
  return newGitIgnoreFilter({ folder: workspace });
}
