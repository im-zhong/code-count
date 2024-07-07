// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "code-count" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand(
    "code-count.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World!");
    }
  );

  // how to add another command?
  // 1. add another command in package.json
  // 2. add another disposable
  // 3. add disposable to context.subscriptions
  // 4. add the command implementation
  // next is the implementation of the countWords command
  const countWords = vscode.commands.registerCommand("code-count.count", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    const text = document.getText();
    const words = text.split(/\s+/).length;
    vscode.window.showInformationMessage(`Words: ${words}`);
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(countWords);
}

// This method is called when your extension is deactivated
export function deactivate() {}
