/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from "vscode";
import { makeAnalyzer } from "./analyzer/factory";
import { LineClass } from "./analyzer/types";
import { DetailedResult } from "./analyzer/types";
import { countWorkspace } from "./statistics/count-workspace";
import { toSupportLanguage } from "./conf/support-languages";
import { WorkspaceStatistics } from "./statistics/workspace-result";
// import { Worker } from "worker_threads";

let statusBarItem: vscode.StatusBarItem;
let workspaceStatistics = new WorkspaceStatistics();

// add a command to iterate the current file folder

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
  subscriptions.push(
    vscode.commands.registerCommand("code-count.countWorkspace", countWorkspace)
  );

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
  subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(updateStatusBarItem)
  );

  // initialized the workspace statistics
  workspaceStatistics = await countWorkspace();

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

  // Get the absolute path of the file in the current editor
  const filePath = editor.document.uri.fsPath;
  // Convert the absolute path to a relative path
  const relativePath = vscode.workspace.asRelativePath(filePath, false);

  const analyzer = makeAnalyzer({
    text: editor.document.getText(),
    languageId: editor.document.languageId,
  });
  if (!analyzer) {
    statusBarItem.hide();
    return;
  }

  const result = analyzer.analyze();
  if (!result) {
    statusBarItem.hide();
    return;
  }
  result.language = toSupportLanguage({
    languageId: editor.document.languageId,
  });
  result.all = editor.document.lineCount;

  workspaceStatistics.updateFile({
    workspaceName: vscode.workspace.name || "unknown",
    relativeFilePath: relativePath,
    analyzeResult: result,
  });
  const { totalCodes, totalComments } = workspaceStatistics.getStatistics({
    workspace: vscode.workspace.name || "unknown",
    language: result.language,
  });

  // const codePercentage =
  //   result.all > 0 ? Math.round((result.codes / result.all) * 100) : 0;
  // const commentPercentage =
  //   result.all > 0 ? Math.round((result.comments / result.all) * 100) : 0;
  // statusBarItem.text = `$(file-code) Codes: ${result.codes}(${codePercentage}%), Comments: ${result.comments}(${commentPercentage}%)`;
  statusBarItem.text = `Codes: ${result.codes}/${totalCodes}, Comments: ${result.comments}/${totalComments}`;
  statusBarItem.show();

  clearBackground({ editor });
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
