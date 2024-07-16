// 2024/7/16
// zhangzhong

// https://code.visualstudio.com/api/extension-guides/command
// https://github.com/kaelzhang/node-ignore
// https://github.com/isaacs/node-glob

import * as vscode from "vscode";
import { glob } from "glob";
import ignore, { Ignore } from "ignore";
import path from "path";
import * as fs from "fs/promises";
import { makeAnalyzer } from "../analyzer/factory";

// const ig = ignore().add(["**/node_modules/**", "**/.git/**"]);

// const paths = [
//   ".abc/a.js", // filtered out
//   ".abc/d/e.js", // included
// ];

// ig.filter(paths); // ['.abc/d/e.js']
// ig.ignores(".abc/a.js"); // true

// we could just give the whole file, that's great!
// add(fs.readFileSync(filenameOfGitignore).toString());

// In other words, each Pathname here should be a relative path to the directory of the gitignore rules.
// https://github.com/kaelzhang/node-ignore?tab=readme-ov-file#pathname-conventions

// https://github.com/kaelzhang/node-ignore?tab=readme-ov-file#2-filenames-and-dirnames
// 感觉他已经给出解决方案了

// 这里要实现的就是一个执行命令的函数
// 然后在activate里面我们绑定这个函数就ok啦
// 每次执行的时候都重新读取gitignore
// 防止用户修改了gitignore

export async function countWorkspace() {
  vscode.window.showInformationMessage("Hello World from countWorkspace!");

  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders === undefined) {
    vscode.window.showInformationMessage("No workspace is opened.");
    return;
  }

  for (const folder of workspaceFolders) {
    await countFolder({ folder });
  }
}

class GitIgnoreFilter {
  private ig: Ignore | null = null;
  constructor({ patterns }: { patterns: string }) {
    this.ig = patterns !== "" ? ignore().add(patterns) : null;
  }

  ignores(path: string): boolean {
    if (this.ig === null) {
      return true;
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
    const suffixes = [
      // C
      ".c",
      ".h",
      // C++
      ".cc",
      ".hh",
      ".cpp",
      ".hpp",
      ".cxx",
      ".hxx",
      ".c++",
      ".h++",
      // Objective-C
      ".m",
      // Objective-C++
      ".mm",
    ];
    const patterns = suffixes.map((suffix) =>
      path.join(folder, "**", `*${suffix}`)
    );

    return (await glob(patterns)).filter((file) => !this.ignores(file));
  }

  async getAllTsFiles({ folder }: { folder: string }): Promise<string[]> {
    const suffixes = [".ts", ".tsx", "js", "jsx", "mjs", "mts"];
    const patterns = suffixes.map((suffix) =>
      path.join(folder, "**", `*${suffix}`)
    );
    return (await glob(patterns)).filter((file) => !this.ignores(file));
  }

  async getAllPyFiles({ folder }: { folder: string }): Promise<string[]> {
    const suffixes = [".py"];
    const patterns = suffixes.map((suffix) =>
      path.join(folder, "**", `*${suffix}`)
    );
    return (await glob(patterns)).filter((file) => !this.ignores(file));
  }
}

async function countFolder({ folder }: { folder: vscode.WorkspaceFolder }) {
  // 不对 每个workspace都有自己的gitginore！
  const paths = [];
  let gitIgnoreContent = "";
  try {
    // 这里要join吧
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

    // calculate all the languages that we support
    // 1. C/C++/Objective-C/Objective-C++
    for (const file of await filter.getAllCppFiles({
      folder: folder.uri.fsPath,
    })) {
      // first read the file
      const content = await fs.readFile(file, { encoding: "utf8" });
      // then make analyzer
      const analyzer = makeAnalyzer({ text: content, languageId: "cpp" });
      if (analyzer === null) {
        continue;
      }
      // count the lines
      const result = analyzer.analyze();
      if (result === null) {
        continue;
      }
      // how to report the result?
      // generate a new page to report ?
      // https://code.visualstudio.com/api/extension-guides/webview
      // 看起来只有这个可以做，我们需要自己写一个html页面，来展示我们的数据了
    }

    // iterate all files in the folder
    // 好像不行 glob太慢了
    // 算了 不用glob了 自己写吧
    // for (const file of await glob(path.join(folder.uri.fsPath, "**"), {
    //   mark: true,
    // })) {
    //   if (filter.ignores(file)) {
    //     continue;
    //   }
    //   // do something with the file
    //   paths.push(file);
    // }

    // 现在我们希望拿到的就是一个list
    // 他可以根据filter和folder
    // 返回一个list，其中的每个文件都是我们需要分析的文件

    // write paths to a file for debugging
    const pathsFile = path.join(folder.uri.fsPath, "paths.txt");
    await fs.writeFile(pathsFile, pathsFile, {
      encoding: "utf8",
    });
  } catch (error) {
    console.error(error);
  }
  // const files = await glob("**", {
  //   // Adds a / character to directory matches.
  //   mark: true,
  // });

  // 咱们吧内容写到文件里面吧 方便调试
}

async function isExists({ path }: { path: string }): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}
