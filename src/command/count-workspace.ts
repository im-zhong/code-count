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
import { SUPPORT_LANGUAGES } from "../conf/support-languages";
import { GitIgnoreFilter } from "./git-ignore-filter";
import { showResult, showWorkspaceResults } from "./result-shower";
import { WorkspaceResult } from "../analyzer/types";

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
    // vscode.window.showInformationMessage("No workspace is opened.");
    return;
  }

  for (const folder of workspaceFolders) {
    await countFolder({ folder });
  }
}

async function countFolderWithLanguage({
  folder,
  languageId,
}: {
  folder: vscode.WorkspaceFolder;
  languageId: string;
}) {
  // 不对 每个workspace都有自己的gitginore！
  const paths = [];
  let gitIgnoreContent = "";
  const results = [];

  // refactor: 这整个处理的逻辑也是一样的
  // 唯一不同的就是languageId不一样
  // 每个文件都需要根据其后缀创建一个analyzer
  // 虽然用glob会有性能问题，不过我们先写出来再说
  // 就先按照目前的方案实现
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

    // 首先找到所有支持的languageId
    //

    let codes = 0;
    let comments = 0;

    // calculate all the languages that we support
    // 1. C/C++/Objective-C/Objective-C++
    for (const file of await filter.getAllFiles({
      folder: folder.uri.fsPath,
      languageId: languageId,
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
      results.push(result);
      // how to report the result?
      // generate a new page to report ?
      // https://code.visualstudio.com/api/extension-guides/webview
      // 看起来只有这个可以做，我们需要自己写一个html页面，来展示我们的数据了
      // TODO: 其实倒也不用，咱们先用vscode的提示功能展示代码行数吧
      // vscode.window.showInformationMessage(
      //   `File: ${file}\nCodes: ${result.codes}\nComments: ${result.comments}`
      // );
      codes += result.codes;
      comments += result.comments;
    }

    // refactor: 这个展示的部分是一样的
    // 所有的输入都是一个list of result，不对，每个result里面都应该包含一个文件名
    // at the final, show the
    // 我们应该展示所有的代码文件，以相对于项目根目录的方式展示
    // 按照代码量codes 进行排序，还是按照glob的顺序进行排序？
    // C/C++:
    // Files: 12, Codes: 1234, Comments: 1234
    // ---------------------------------------
    // File: xxx/xxx.cpp, Codes: 100(12%), Comments: 1234(3%)
    // vscode.window.showInformationMessage(
    //   `Codes: ${codes}, Comments: ${comments}`
    // );

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
    // const pathsFile = path.join(folder.uri.fsPath, "paths.txt");
    // await fs.writeFile(pathsFile, paths, {
    //   encoding: "utf8",
    // });
  } catch (error) {
    console.error(error);
  }
  // const files = await glob("**", {
  //   // Adds a / character to directory matches.
  //   mark: true,
  // });
  return results;

  // 咱们吧内容写到文件里面吧 方便调试
}

async function countFolder({ folder }: { folder: vscode.WorkspaceFolder }) {
  // 遍历所有的支持的语言
  let message = "";
  const workspaceResults: WorkspaceResult[] = [];
  for (const languageId of SUPPORT_LANGUAGES) {
    const results = await countFolderWithLanguage({ folder, languageId });

    workspaceResults.push({
      workspace: "",
      language: languageId,
      results: results,
    } satisfies WorkspaceResult);
    // 然后展示结果
    // 我们可以提供一个dict
    // key是语言，value就是results
    // message += showResult({ languageId, results });
  }

  // 这里需要拿到结果进行统一的汇报
  // 所以上面的函数应该就是
  // show message here
  // https://github.com/microsoft/vscode/issues/101589
  // vscode can not show structured message, how to
  // the only way to do it better is generate a new html page and render it
  // so we need a new function
  showWorkspaceResults({ workspaceResults });
}

async function isExists({ path }: { path: string }): Promise<boolean> {
  try {
    await fs.access(path, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch (error) {
    return false;
  }
}
