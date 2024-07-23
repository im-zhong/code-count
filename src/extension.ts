/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from "vscode";
import { makeAnalyzer } from "./analyzer/factory";
import { LineClass } from "./analyzer/types";
import { FileResult } from "./analyzer/types";
import { toSupportedLanguage } from "./conf/support-languages";
import { WorkspaceCounter } from "./statistics/workspace-result";
import { getSupportedLanguageFromPath } from "./conf/support-languages";
import { getGitIgnoreFilter } from "./statistics/git-ignore-filter";
import path from "path";
import { filterManager } from "./statistics/git-ignore-filter";
// import { Worker } from "worker_threads";

let statusBarItem: vscode.StatusBarItem;
let workspaceStatistics = new WorkspaceCounter();

// add a command to iterate the current file folder

// 先列出需要处理的动作
// 咱们可以为每个动作都写一个函数
// 但是这些应该非常简单，由一些其他的函数提供功能
// 比如 updateStatusBarItem 等等函数
//
// Trigger: This event is fired when the active text editor changes. This can happen when a new editor is opened, an existing editor is brought into focus, or when the user switches between editors.
// vscode.window.onDidChangeActiveTextEditor
// 当我们激活一个新的editor的时候，我们可以得到他的workspace和relativeFilePath和languageId
// 我们需要根据这些信息去workspaceCounter中查找对应的结果 其实对于前端来说就这么简单
// workspaceCounter.getStatistics({workspace, language, relativePath}) -> {currentCodes, currentComments, totalCodes, totalComments}
// 那么他会返回两个东西？一个是总的统计信息，一个是当前文件的统计信息
// 可以分开吗？分开其实就是不好的API设计，因为我们假设用户必须先调用当前文件的统计信息，然后再调用总的统计信息，这显然是极易出错的
// 接口不应该对用户有任何的假设，也能轻易调用的话是最好的
//
// vscode.workspace.onDidSaveTextDocument
// TODO: 第一步先不考虑那么复杂的逻辑，先实现上面比较简单的功能
// vscode.workspace.onDidDeleteFiles
// vscode.workspace.onDidRenameFiles
//
// maybe this trigger is not necessary
// vscode.workspace.onDidOpenTextDocument
// This event is fired when a text document is opened. This includes opening a document in an editor, but also other scenarios where a document is opened in the background without an associated editor, such as when a document is opened for background processing by an extension

// https://github.com/microsoft/vscode-extension-samples/issues/22
// decorationType should be created only once
const codeDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(0,255,0,0.3)",
});
const commentDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255,0,0,0.3)",
});
const codeCommentDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(0,0,255,0.3)",
});

// default do not toggle the background color
let backgroundToggle = false;

// Function to spawn a worker and communicate with it
// function useWorker() {
//   const worker = new Worker("./path/to/workerScript.js", { eval: false });

//   worker.on("message", (message) => {
//     console.log(message); // Log messages from the worker
//   });

//   worker.postMessage("Start task"); // Send a task to the worker

//   worker.on("error", (error) => {
//     console.error("Worker error:", error);
//   });

//   worker.on("exit", (code) => {
//     if (code !== 0) {
//       console.error(`Worker stopped with exit code ${code}`);
//     }
//   });
// }

// the activate function in a Visual Studio Code extension is called only once throughout the entire lifecycle of the extension. It is invoked by VS Code when the extension is first activated. Activation can occur due to a variety of reasons specified in the extension's package.json file, such as the user opening a file of a certain type, running a command defined by the extension, or other activation events. The purpose of the activate function is to set up any necessary resources, commands, listeners, or other initialization tasks needed for the extension to work.
export async function activate({ subscriptions }: vscode.ExtensionContext) {
  // at the very beginning, start a worker thread
  // useWorker();

  // register a command that is invoked when the status bar
  // item is selected
  const commandId = "code-count.showCodeCount";
  subscriptions.push(
    vscode.commands.registerCommand(commandId, () => {
      backgroundToggle = !backgroundToggle;
      updateStatusBarItem();
    })
  );

  const handleEvent = ({
    handler,
  }: {
    handler: ({
      workspaceFolder,
      editor,
      language,
    }: {
      workspaceFolder: vscode.WorkspaceFolder;
      editor: vscode.TextEditor;
      language: string;
    }) => Promise<void>;
  }) => {
    return async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        statusBarItem.hide();
        return;
      }

      const workspaceFolder = vscode.workspace.getWorkspaceFolder(
        editor.document.uri
      );
      if (!workspaceFolder) {
        statusBarItem.hide();
        return;
      }

      const language = editor.document.languageId;
      if (!toSupportedLanguage({ languageId: language })) {
        statusBarItem.hide();
        return;
      }

      await workspaceStatistics.triggerStatistic({
        workspaceFolder,
        language,
      });

      await handler({ workspaceFolder, editor, language });
    };
  };

  // 根据目前的设计，两个事件的handel实际上是一样的
  // 关键是其他event的实现
  // 比如删除文件
  // 删除文件
  // 我们是有可能在一上来就删除一个文件的
  // 因为我们的代码统计只会在第一次打开文件的时候触发
  // 那么我们有可能一上来就删除一个文件
  // 但是在这种情况下，我们是没有必要做任何动作的
  // 因为本来就没有统计
  // 这种情况只需要判断statistics是否有对应的文件存在就ok了
  // 另外一种情况就是我们已经统计过了
  // 然后删除的逻辑和上面其实还是一样啊
  // 无论如何，删除都不会触发trigger

  // 但是重命名会触发statistic吗？
  // 我们有可能在没有统计的情况下重命名一个文件
  // 此时也只需要判断statistics是否有对应的文件存在就ok了
  // 如果没有 就什么都不需要做
  // 如果已经有统计了，那么我们先判断当前文件是否在统计中
  // 如果在，就直接重命名就好
  // 如果不在，那么就分析一下当前文件，然后更新statistics即可
  // 或许重命名可以理解为一次删除 + 一次保存
  // 就是触发了两次事件
  // 那这样实现整个功能只需要实现两个事件函数

  // 这样设计或许效率不是最高的
  // 但是也不会很慢
  // 但是实现起来非常简单，代码非常清晰

  const needHandle = async (
    uri: vscode.Uri
  ): Promise<
    | {
        workspaceFolder: vscode.WorkspaceFolder;
        language: string;
      }
    | undefined
  > => {
    // we just call the api
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
      return undefined;
    }
    // and we need to get the language of the deleted file
    // actually uri has the suffix
    // we could use the suffix to get the language

    // path分为两种
    // 一种是absolutePath, 一种是relativePath
    // 显然用全称可读性更高

    // 应该先判断是不是被ignore了
    // 如果被ignore 根本不需要处理
    const filter = await getGitIgnoreFilter({ workspace: workspaceFolder });
    // 卧槽！不能用path作为变量名，因为有一个模块的名字叫做path！
    if (filter.ignores(path.relative(workspaceFolder.uri.fsPath, uri.fsPath))) {
      return undefined;
    }

    const language = getSupportedLanguageFromPath({ path: uri.fsPath });
    if (!language) {
      return undefined;
    }

    return { workspaceFolder, language };
  };

  const deleteFile = async (uri: vscode.Uri) => {
    const r = await needHandle(uri);
    if (!r) {
      return;
    }
    const { workspaceFolder, language } = r;

    workspaceStatistics.deleteFile({
      workspaceName: workspaceFolder.name,
      language: language,
      absolutePath: uri.fsPath,
    });
  };

  const saveFile = async (uri: vscode.Uri) => {
    // if uri is .gitignore file, we should update the filter
    if (path.basename(uri.fsPath) === ".gitignore") {
      saveGitIgnore(uri);
      return;
    }

    const { workspaceFolder, language } = (await needHandle(uri)) ?? {};
    if (!workspaceFolder || !language) {
      return;
    }

    // 无论如何，我们如果触发了全局统计
    // 我们显然是不需要再次执行当前文件的统计的
    const isTriggered = await workspaceStatistics.triggerStatistic({
      workspaceFolder,
      language,
    });

    // 但是，只要没有触发，那么我们最好是重新统计并更新一下
    if (!isTriggered) {
      // 而且对于文件的更新操作，让counter来代劳就ok啦
      await workspaceStatistics.updateFile({
        workspaceName: workspaceFolder.name,
        language,
        absolutePath: uri.fsPath,
      });
    }

    // 在这里不进行展示
    // 对数据的处理和展示分开写
    // 等想要展示的时候直接拿数据就行了

    // 我发现trigger的处理逻辑总是包含着对当前文件的处理？
    //
    // 在这里应该是可以拿到editor的
    // 如果拿不到editor，那么我们就不进行分析
    // 但是这有可能导致一种情况的发生，就是
  };

  const handleDidDeleteFiles = async (event: vscode.FileDeleteEvent) => {
    // 如果我们删除的是一整个文件夹呢？
    // 是可以正确处理的
    event.files.forEach(async (uri: vscode.Uri) => {
      deleteFile(uri);
    });
  };

  const saveGitIgnore = async (uri: vscode.Uri) => {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (!workspaceFolder) {
      return;
    }

    filterManager.deleteFilter({ workspaceName: workspaceFolder.name });
    workspaceStatistics.deleteWorkspace({
      workspaceName: workspaceFolder.name,
    });
  };

  const handleDidRenameFiles = async (event: vscode.FileRenameEvent) => {
    // 如果我们重命名的是一整个文件夹呢？
    // 是可以正确处理的
    event.files.forEach(async ({ oldUri, newUri }) => {
      // just delete this file
      // we need to extract the delete file impl
      await deleteFile(oldUri);
      // and save new file
      // and we should extract the save file impl
      await saveFile(newUri);
    });

    // ！！！重大发现，这样其实就很简单了
    // 好像只有保存gitignore文件的时候
    // 才有可能触发trigger

    // 还没有考虑gitignore文件的修改
    // 如果我们修改了gitignore文件，那么我们需要重新统计
    // 如果删除了gitignore
    // 如果重命名了gitignore
    // 所有所有的一切情况，都会导致我们需要重新统计
    // 这个功能应该可以被一个函数进行解决
    // 只要动了gitignore 我们就重新统计就ok了

    // 还有一个就是打开了一个被ignore的文件的时候
    // 插件是不会工作的
    // 这个工作应该是由全局的单例filter来实现的

    const handleDidChangeActiveTextEditor = async ({
      workspaceFolder,
      editor,
      language,
    }: {
      workspaceFolder: vscode.WorkspaceFolder;
      editor: vscode.TextEditor;
      language: string;
    }): Promise<void> => {
      // 不管是打开文件还是保存文件
      // 我们都可能遇到statistics中没有当前文件
      // 但是我们需要更新当前文件的统计信息的情况

      // 所以为了简单起见，不如我们不管发生什么 一定会重新统计当前文件的信息
      // 然后更新statistics 这是最简单方便一致的实现方案

      // first check workspace is exist or not
      // get relative path?
      // or just pass the path
      // I think just pass the path is ok
      // in that way, we obtain the biggest flexibility
      // const isTriggered = await workspaceStatistics.triggerStatistic({
      //   workspaceFolder,
      //   language,
      // });

      // check if we already have the result
      // const result = workspaceStatistics.getFileResultOnlyLookTable({
      //   workspaceName: workspaceFolder.name,
      //   path: editor.document.uri.fsPath,
      //   language,
      // });

      // if (!result) {
      //   // if we do not have the result, we should check it on our own
      //   // and update the workspaceStatistics
      //   // const result = analyzer.analyze();
      //   // workspaceStatistics.updateFile(result)
      // }

      // now we get the result and we should get the total result
      const { totalCodes, totalComments } =
        workspaceStatistics.getTotalCodesAndComments({
          workspaceName: workspaceFolder.name,
          language,
        });

      // then we update the status bar item
      // we need to
      // updateStatusBarItem({ result, totalCodes, totalComments });
    };

    // 我们可以按照这个思路写一下其他的事件处理函数
    // 找出他们的共同点并且进行合并
    const handleDidSaveTextDocument = async ({
      workspaceFolder,
      editor,
      language,
    }: {
      workspaceFolder: vscode.WorkspaceFolder;
      editor: vscode.TextEditor;
      language: string;
    }): Promise<void> => {
      // 当我们保存文件的时候会发生什么？
      // 好像无论什么动作，我们都需要先triggerStatistic
      // 因为这都有可能引发一次文件的变化 都有可能打开一个新的文件
      // 并且检查一次其实很快 所以没什么不好，
      // 这一部分是可以移动到公共代码中的
    };

    // register a command that could count the whole workspace
    // subscriptions.push(
    //   vscode.commands.registerCommand("code-count.countWorkspace", countWorkspace)
    // );

    // create a new status bar item that we can now manage
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItem.command = commandId;
    subscriptions.push(statusBarItem);

    // register some listener that make sure the status bar
    // item always up-to-date
    // This event is triggered whenever the active text editor changes, which includes focusing on a different editor window.
    subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem)
    );
    // 现在我们需要拆分一下动作
    //
    subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(updateStatusBarItem)
    );

    // // trigger analyzer when change workspace
    // subscriptions.push(
    //   vscode.workspace.onDidChangeWorkspaceFolders(updateStatusBarItem)
    // );
    // // trigger when delete some files
    // vscode.workspace.onDidDeleteFiles(updateStatusBarItem);
    // // trigger re-statistic on rename file
    // vscode.workspace.onDidRenameFiles(updateStatusBarItem);
    // // trigger when open some file
    // vscode.workspace.onDidOpenTextDocument(updateStatusBarItem);

    // initialized the workspace statistics
    // workspaceStatistics = await countWorkspace();

    // update status bar item once at the beginning
    await updateStatusBarItem();
  };

  async function updateStatusBarItem(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      statusBarItem.hide();
      return;
    }

    // get current active editor's relative path
    // if the file is not saved, the uri will be undefined

    // // Get the absolute path of the file in the current editor
    // const filePath = editor.document.uri.fsPath;
    // // Convert the absolute path to a relative path
    // const relativePath = vscode.workspace.asRelativePath(filePath, false);

    // const analyzer = makeAnalyzer({
    //   text: editor.document.getText(),
    //   languageId: editor.document.languageId,
    // });
    // if (!analyzer) {
    //   statusBarItem.hide();
    //   return;
    // }

    // const result = analyzer.analyze();
    // if (!result) {
    //   statusBarItem.hide();
    //   return;
    // }
    // result.language = toSupportedLanguage({
    //   languageId: editor.document.languageId,
    // });
    // result.all = editor.document.lineCount;

    // workspaceStatistics.updateFile({
    //   workspaceName: vscode.workspace.name || "unknown",
    //   relativeFilePath: relativePath,
    //   analyzeResult: result,
    // });
    // vscode.workspace.name
    // vscode.workspace.name
    // Purpose: This property provides the name of the workspace. In the context of VS Code, a "workspace" can refer to a single folder opened in VS Code or a multi-root workspace (which is a collection of folders that are opened in a single VS Code instance).
    // Usage: It is useful when you need to display the name of the current workspace or when you need to differentiate between workspaces in a multi-workspace environment.
    // Return Value: It returns a string representing the name of the workspace. For a single folder, it's the name of that folder. For a multi-root workspace, it's the name of the workspace as defined in the .code-workspace file. If there is no open workspace, it returns undefined.
    //
    // vscode.workspace.getWorkspaceFolder(editor.document.uri)
    // Purpose: This function is used to retrieve the workspace folder that contains a given file. In a multi-root workspace, this is particularly useful because it allows you to determine which of the multiple folders a file belongs to.
    // Usage: It is used when you need to perform operations relative to the folder containing a file, such as resolving relative paths or applying folder-specific configurations.
    // Parameters: It takes a Uri object representing the file's location.
    // Return Value: It returns a WorkspaceFolder object that contains information about the workspace folder, such as its uri, name, and index. If the file is not contained in any workspace folder, it returns undefined.

    const { result, totalCodes, totalComments } =
      await workspaceStatistics.getStatistics({
        workspaceFolder: vscode.workspace.getWorkspaceFolder(
          editor.document.uri
        ),
        languageId: editor.document.languageId,
        text: editor.document.getText(),
        relativePath: vscode.workspace.asRelativePath(
          editor.document.uri,
          false
        ),
      });
    if (!result) {
      statusBarItem.hide();
      return;
    }

    // const codePercentage =
    //   result.all > 0 ? Math.round((result.codes / result.all) * 100) : 0;
    // const commentPercentage =
    //   result.all > 0 ? Math.round((result.comments / result.all) * 100) : 0;
    // statusBarItem.text = `$(file-code) Codes: ${result.codes}(${codePercentage}%), Comments: ${result.comments}(${commentPercentage}%)`;
    statusBarItem.text = `Codes: ${result.codes}/${totalCodes}, Comments: ${result.comments}/${totalComments}`;
    statusBarItem.show();

    clearBackground({ editor });
    // 不行，我们还是要保存所有的结果，也就是FileResult
    updateBackground({ editor, result });
  }

  function clearBackground({ editor }: { editor: vscode.TextEditor }) {
    editor.setDecorations(codeDecorationType, []);
    editor.setDecorations(commentDecorationType, []);
    editor.setDecorations(codeCommentDecorationType, []);
  }

  function updateBackground({
    editor,
    result,
  }: {
    editor: vscode.TextEditor;
    result: FileResult;
  }) {
    if (!backgroundToggle) {
      return;
    }

    let codes = [];
    let comments = [];
    let codeComments = [];
    for (let lineNo = 0; lineNo < result.lineClasses.length; lineNo++) {
      const range = new vscode.Range(
        new vscode.Position(lineNo, 0),
        new vscode.Position(lineNo, editor.document.lineAt(lineNo).text.length)
      );

      const lineClass = result.lineClasses[lineNo];
      if (lineClass === LineClass.Code) {
        codes.push(range);
      } else if (lineClass === LineClass.Comment) {
        comments.push(range);
      } else if (lineClass === LineClass.CodeComment) {
        codeComments.push(range);
      }
    }

    editor.setDecorations(codeDecorationType, codes);
    editor.setDecorations(commentDecorationType, comments);
    editor.setDecorations(codeCommentDecorationType, codeComments);
  }
}
