/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from "vscode";
import { makeAnalyzer } from "./analyzer/factory";
import { LineClass } from "./analyzer/types";
import { DetailedResult } from "./analyzer/types";
import { toSupportedLanguage } from "./conf/support-languages";
import { WorkspaceCounter } from "./statistics/workspace-result";
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
  // subscriptions.push(
  //   vscode.workspace.onDidSaveTextDocument(updateStatusBarItem)
  // );

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
  updateStatusBarItem();
}

function updateStatusBarItem(): void {
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
    workspaceStatistics.getStatistics({
      workspaceFolder: vscode.workspace.getWorkspaceFolder(editor.document.uri),
      languageId: editor.document.languageId,
      text: editor.document.getText(),
      relativePath: vscode.workspace.asRelativePath(editor.document.uri, false),
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
  result: DetailedResult;
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
