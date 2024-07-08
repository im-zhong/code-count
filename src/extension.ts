/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from "vscode";
import { makeAnalyzer } from "./analyzer/code-counter";
import { TsAnalyzer } from "./analyzer/ts-analyzer";
import { Result } from "./analyzer/types";
import { LineClass } from "./analyzer/types";

let myStatusBarItem: vscode.StatusBarItem;
// create three decorations
const codeDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(0,255,0,0.3)",
});
const commentDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255,0,0,0.3)",
});
const codeCommentDecorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(0,0,255,0.3)",
});

function highlightLine({
  lineNo,
  decorationType,
}: {
  lineNo: number;
  decorationType: vscode.TextEditorDecorationType;
}) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return; // No open text editor
  }

  // Define the decoration type with a background color
  // const decorationType = vscode.window.createTextEditorDecorationType({
  //   backgroundColor: color, // Red with some transparency
  // });

  // Specify the range for line 10 (lines are zero-indexed)
  const start = new vscode.Position(lineNo, 0); // Line 10, Column 1
  const end = new vscode.Position(
    lineNo,
    editor.document.lineAt(lineNo).text.length
  );
  const range = new vscode.Range(start, end);

  // Apply the decoration to the specified range
  // editor.setDecorations(vscode.window.createTextEditorDecorationType({}), [
  //   range,
  // ]);
  // TODO
  // 我懂了！decoration只能被设置一次
  // 所以我们实际上要计算的是range
  // 然后只需要调用三次setDecorations就可以了 在对应的range上就可以了
  editor.setDecorations(decorationType, [range]);
}

// the activate function in a Visual Studio Code extension is called only once throughout the entire lifecycle of the extension. It is invoked by VS Code when the extension is first activated. Activation can occur due to a variety of reasons specified in the extension's package.json file, such as the user opening a file of a certain type, running a command defined by the extension, or other activation events. The purpose of the activate function is to set up any necessary resources, commands, listeners, or other initialization tasks needed for the extension to work.
export function activate({ subscriptions }: vscode.ExtensionContext) {
  // register a command that is invoked when the status bar
  // item is selected

  // TODO: click the button to toggle showing the backgournd color
  const myCommandId = "sample.showSelectionCount";
  subscriptions.push(
    vscode.commands.registerCommand(myCommandId, () => {
      const n = getNumberOfSelectedLines(vscode.window.activeTextEditor);
      vscode.window.showInformationMessage(
        `Yeah, ${n} line(s) selected... Keep going!`
      );
    })
  );

  // create a new status bar item that we can now manage
  myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  myStatusBarItem.command = myCommandId;
  subscriptions.push(myStatusBarItem);

  // register some listener that make sure the status bar
  // item always up-to-date
  // This event is triggered whenever the active text editor changes, which includes focusing on a different editor window.
  subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem)
  );
  subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(updateStatusBarItem)
  );
  // subscriptions.push(
  //   vscode.window.onDidChangeTextEditorSelection(updateStatusBarItem)
  // );

  // update status bar item once at start
  updateStatusBarItem();
}

function updateStatusBarItem(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    myStatusBarItem.hide();
    return;
  }

  const documentContent = editor.document.getText();
  const languageId = editor.document.languageId;
  const lineCount = editor.document.lineCount;

  // vscode.window.showInformationMessage("starting analyze");
  const analyzer = makeAnalyzer({ text: documentContent, languageId });
  if (!analyzer) {
    // vscode.window.showInformationMessage("analyze failed!");
    myStatusBarItem.hide();
    return;
  }
  // const analyzer = new TsAnalyzer({ text: documentContent });
  const result = analyzer.analyze();
  // vscode.window.showInformationMessage("analyze success!");

  if (!result) {
    // vscode.window.showInformationMessage("analyze failed!");
    myStatusBarItem.hide();
    return;
  }

  // const result = countCode({ text: documentContent, language: languageId });
  result.all = lineCount;
  const codePercentage = Math.round((result.codes / result.all) * 100);
  const commentPercentage = Math.round((result.comments / result.all) * 100);
  // vscode.window.showInformationMessage(
  //   `Codes: ${result.codes}(${codePercentage}%), Comments: ${result.comments}(${commentPercentage}%), Total: ${result.all}`
  // );

  myStatusBarItem.text = `$(file-code) Codes: ${result.codes}(${codePercentage}%), Comments: ${result.comments}(${commentPercentage}%)`;
  myStatusBarItem.show();

  // https://github.com/microsoft/vscode-extension-samples/issues/22
  // 他的意思是这个decorationType只应该被调用一次
  // 也就是说，他们应该是全局变量？
  // clear the decoration first
  editor.setDecorations(codeDecorationType, []);
  editor.setDecorations(commentDecorationType, []);
  editor.setDecorations(codeCommentDecorationType, []);
  // [
  //   codeDecorationType,
  //   commentDecorationType,
  //   codeCommentDecorationType,
  // ].forEach((decorationType) => {
  //   decorationType.dispose();
  // });

  // create three decorations
  // codeDecorationType = vscode.window.createTextEditorDecorationType({
  //   backgroundColor: "rgba(0,255,0,0.3)",
  // });
  // commentDecorationType = vscode.window.createTextEditorDecorationType({
  //   backgroundColor: "rgba(255,0,0,0.3)",
  // });
  // codeCommentDecorationType = vscode.window.createTextEditorDecorationType({
  //   backgroundColor: "rgba(0,0,255,0.3)",
  // });

  // 获取到三个种类的range就ok啦
  // 第一步是获取三个list 每个list保存的就是对应种类的行好
  // 我们让第一个list表示code 第二个list表示comment 第三个list表示codeComment
  let codes = [];
  let comments = [];
  let codeComments = [];
  for (let i = 0; i < result.lineClasses.length; i++) {
    // 我感觉应该直接返回range

    const range = new vscode.Range(
      new vscode.Position(i, 0),
      new vscode.Position(i, editor.document.lineAt(i).text.length)
    );

    const lineClasses = result.lineClasses[i];
    if (lineClasses === LineClass.Code) {
      codes.push(range);
    } else if (lineClasses === LineClass.Comment) {
      comments.push(range);
    } else if (lineClasses === LineClass.CodeComment) {
      codeComments.push(range);
    }
  }

  // 然后我们就可以直接设置decoration了
  editor.setDecorations(codeDecorationType, codes);
  editor.setDecorations(commentDecorationType, comments);
  editor.setDecorations(codeCommentDecorationType, codeComments);

  // 然后每个list里面的行号就是我们要的range

  // highlightLine({ lineNo: 1, color: "rgba(255,0,0,0.3)" });
  // for (let i = 0; i < result.lineClasses.length; i++) {
  //   // for (const [i, lineClasses] of result.lineClasses.entries()) {
  //   const lineClasses = result.lineClasses[i];
  //   if (lineClasses === LineClass.Code) {
  //     highlightLine({ lineNo: i, decorationType: codeDecorationType });
  //   } else if (lineClasses === LineClass.Comment) {
  //     highlightLine({ lineNo: i, decorationType: commentDecorationType });
  //   } else if (lineClasses === LineClass.CodeComment) {
  //     highlightLine({ lineNo: i, decorationType: codeCommentDecorationType });
  //   }
  // }
}

function getNumberOfSelectedLines(
  editor: vscode.TextEditor | undefined
): number {
  let lines = 0;
  if (editor) {
    lines = editor.selections.reduce(
      (prev, curr) => prev + (curr.end.line - curr.start.line),
      0
    );
  }
  return lines;
}
