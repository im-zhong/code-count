// 2024/7/17
// zhangzhong

import * as vscode from "vscode";

import { glob } from "glob";
import ignore, { Ignore } from "ignore";
import path from "path";
import * as fs from "fs/promises";
import {
  toSupportedLanguage,
  supported_suffixes,
} from "../common/support-languages";

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
  // async getAllCppFiles({ folder }: { folder: string }): Promise<string[]> {
  //   let startTime = new Date().getTime();

  //   const patterns = CPP_SUFFIXES.map(
  //     (suffix) => path.join(folder, "**", `*${suffix}`)
  //     //path.join("**", `*${suffix}`)
  //   );
  //   // 其实我有点想知道
  //   // 直接glob会拿到什么
  //   // 这样反而会慢一些。。。
  //   //
  //   // const files = await glob(patterns, { cwd: folder });
  //   // 我觉得我需要比较一下这几种方法的性能
  //   const files = await glob(patterns);
  //   const filtered_files = files.filter(
  //     (file) => !this.ignores(path.relative(folder, file))
  //   );
  //   let endTime = new Date().getTime();
  //   console.log(`folder prefix cost time: ${endTime - startTime}ms`);

  //   // now we use another method
  //   // 这种方法太慢了
  //   // startTime = new Date().getTime();
  //   // const patterns2 = CPP_SUFFIXES.map((suffix) =>
  //   //   path.join("**", `*${suffix}`)
  //   // );
  //   // const files2 = await glob(patterns2);
  //   // const filtered_files2 = files2.filter((file) => !this.ignores(file));
  //   // endTime = new Date().getTime();
  //   // console.log(`cwd cost time: ${endTime - startTime}ms`);

  //   // return (await glob(patterns)).filter((file) => !this.ignores(file));
  //   return filtered_files;
  // }

  // async getAllTsFiles({ folder }: { folder: string }): Promise<string[]> {
  //   // const suffixes = [".ts", ".tsx", "js", "jsx", "mjs", "mts"];
  //   const patterns = TS_SUFFIXES.map((suffix) =>
  //     path.join(folder, "**", `*${suffix}`)
  //   );
  //   return (await glob(patterns)).filter((file) => !this.ignores(file));
  // }

  // async getAllPyFiles({ folder }: { folder: string }): Promise<string[]> {
  //   // const suffixes = [".py"];
  //   const patterns = PY_SUFFIXES.map((suffix) =>
  //     path.join(folder, "**", `*${suffix}`)
  //   );
  //   const files = await glob(patterns);
  //   // 草！这里忘了加relative！！！
  //   // 其实仔细看所有的语言的getfiles逻辑都是一样的
  //   // 我们应该提取extract这个逻辑
  //   // 其实就是需要一个从语言到后缀的映射而已
  //   return files.filter((file) => !this.ignores(file));
  // }

  async getAllFiles({
    folder,
    languageId,
  }: {
    folder: string;
    languageId: string;
  }): Promise<string[]> {
    // TODO: 这里或许应该把languageId换成supportedlanguage
    const language = toSupportedLanguage({ languageId });
    if (!(language in supported_suffixes)) {
      return [];
    }

    const suffixes = supported_suffixes[language];
    const patterns = suffixes.map(
      (suffix) => path.join(folder, "**", `*${suffix}`)
      //path.join("**", `*${suffix}`)
    );
    const files = await glob(patterns);
    const filtered_files = files.filter(
      (file) => !this.ignores(path.relative(folder, file))
    );
    return filtered_files;
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

// 当且仅当保存gitignore文件的时候，我们需要重新生成filter
// 同时需要重新计算整个项目？
// 有一个最简单的方法，就是把filter和statistics给删了
// 这样下次我们点开某个文件的时候，就会自动触发重新计算的流程！
// 完美！！！

export function getGitIgnoreFilter({
  workspace,
}: {
  workspace: vscode.WorkspaceFolder;
}) {
  // TODO
  // 实际上这里可以使用单例
  // 并且对于每个workspace 我们维护一个filter
  // 当.gitignore文件发生变化时
  // 我们的filter也要发生变化
  return newGitIgnoreFilter({ folder: workspace });
}
