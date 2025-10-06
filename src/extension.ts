// 2024/7/24
// zhangzhong

// TIP: we count codes lazily, which means we only count the workspace when user interact
// with a file in that workspace, and only consider one language in each counting process

import path from "path";

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import { reload, isReloading } from "./command/reload";
import { summarize } from "./command/summarize";
import {
  getSupportedLanguageFromPath,
  SupportedLanguage,
} from "./common/supported-languages";
import { WorkspaceCounter } from "./counter/workspace-counter";
import { updateStatusBarItem } from "./display/status";
import { filterManager } from "./filter/filter-manager";
import { getWorkspaceFolderFromUri } from "./utils/file";
import { registerLoadingStatusBarItem } from "./utils/loading-status-bar-item";
import { activateOutputChannel } from "./utils/output-channel";


let statusBarItem: vscode.StatusBarItem;
let workspaceCounter = new WorkspaceCounter();

// default do not toggle the background color
let backgroundToggle = false;

// the activate function in a Visual Studio Code extension is called only once throughout the entire lifecycle of the extension. It is invoked by VS Code when the extension is first activated. Activation can occur due to a variety of reasons specified in the extension's package.json file, such as the user opening a file of a certain type, running a command defined by the extension, or other activation events. The purpose of the activate function is to set up any necessary resources, commands, listeners, or other initialization tasks needed for the extension to work.
export async function activate({ subscriptions }: vscode.ExtensionContext) {
  // https://code.visualstudio.com/api/extension-guides/command#creating-new-commands
  // register a command that is invoked when the status bar item is selected
  const commandId = "code-count.showCodeCount";
  // When you add disposables to the subscriptions array,
  // Visual Studio Code will automatically dispose of them when the extension is deactivated,
  // ensuring that resources are properly released and preventing memory leaks.
  subscriptions.push(
    vscode.commands.registerCommand(commandId, () => {
      backgroundToggle = !backgroundToggle;
      updateStatusBarItem({ workspaceCounter, statusBarItem, backgroundToggle, selectedText: undefined });
    }),
  );

  // register a command that will generate summary files for workspaces
  subscriptions.push(
    vscode.commands.registerCommand("code-count.summarize", async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        await summarize({ workspaceFolders });
      } else {
        vscode.window.showErrorMessage("No workspace folder is open.");
      }
    }),
  );

  // register a command that will reload the project
  subscriptions.push(
    vscode.commands.registerCommand("code-count.reload", async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        await reload({ workspaceFolders, workspaceCounter, statusBarItem, backgroundToggle });
      } else {
        vscode.window.showErrorMessage("No workspace folder is open.");
      }
    }),
  );

  // Create the Output Channel and register it with the subscriptions array
  subscriptions.push(activateOutputChannel("Code Count"));

  // create a new status bar item that will show at the right end of the status bar
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.command = commandId;
  // When the user hovers over the status bar item, this message will be displayed.
  // The tooltip for a status bar item in a Visual Studio Code extension can be a Markdown string.
  // This allows you to include rich text formatting, links, and other Markdown features in the tooltip.
  statusBarItem.tooltip = new vscode.MarkdownString(
    "# Count Codes And Comments\n- The beginning icon is standing for the language of the current file.\n- In Codes: x/y, x means the lines of codes in the current file, y means the total lines of codes that belongs to the same langugae in the current workspcae.\n- Annos: x/y means the lines of comments in the current file and the current workspace.\n # Toggle Background Color\n- Click to toggle the background color in the current file to check codes and comments line by line.",
  );
  subscriptions.push(statusBarItem);

  // add loading status bar item
  subscriptions.push(registerLoadingStatusBarItem());

  // This event is fired when the active text editor changes
  // This can happen when a new editor is opened, an existing editor is brought into focus,
  // or when the user switches between editors.
  subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(
      async (textEditor: vscode.TextEditor | undefined) => {
        if (textEditor) {
          await lookFile(textEditor.document.uri);
        }
        await updateStatusBarItem({ workspaceCounter, statusBarItem, backgroundToggle, selectedText: undefined });
      },
    ),
  );
  // Notebok Editor and Text Editor use different event to trigger
  vscode.window.onDidChangeActiveNotebookEditor(
    async (notebookEditor: vscode.NotebookEditor | undefined) => {
      if (notebookEditor) {
        await lookFile(notebookEditor.notebook.uri);
      }
      await updateStatusBarItem({ workspaceCounter, statusBarItem, backgroundToggle, selectedText: undefined });
    },
  );

  // The vscode.workspace.onDidSaveTextDocument event in Visual Studio Code is triggered whenever a text document (file) is saved.
  // This can happen in several scenarios:
  // - Manual Save
  // - Auto Save
  // - Programmatic Save
  // - Save All
  subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(
      async (document: vscode.TextDocument) => {
        await saveFile(document.uri);
        await updateStatusBarItem({ workspaceCounter, statusBarItem, backgroundToggle, selectedText: undefined });
      },
    ),
  );
  subscriptions.push(
    vscode.workspace.onDidSaveNotebookDocument(
      async (document: vscode.NotebookDocument) => {
        await saveFile(document.uri);
        await updateStatusBarItem({ workspaceCounter, statusBarItem, backgroundToggle, selectedText: undefined });
      },
    ),
  );

  // The vscode.workspace.onDidRenameFiles event is triggered in Visual Studio Code when one or more files in the workspace are renamed.
  // This includes scenarios such as:
  // - Manual Rename 
  // - Programmatic Rename
  subscriptions.push(
    vscode.workspace.onDidRenameFiles(async (event: vscode.FileRenameEvent) => {
      event.files.forEach(async ({ oldUri, newUri }) => {
        await deleteFile(oldUri);
        await saveFile(newUri);
      });
    }),
  );

  // The vscode.workspace.onDidDeleteFiles event is triggered in Visual Studio Code when one or more files in the workspace are deleted.
  // This includes scenarios such as:
  // - Manual Delete
  // - Programmatic Delete
  subscriptions.push(
    vscode.workspace.onDidDeleteFiles(async (event: vscode.FileDeleteEvent) => {
      event.files.forEach(async (uri: vscode.Uri) => {
        deleteFile(uri);
      });
    }),
  );

  // An Event which fires when the selection in an editor has changed.
  subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(
      async (event: vscode.TextEditorSelectionChangeEvent) => {
        // only when user select multiple lines, we will show the selected codes and comments
        if (event.selections.length > 0 && !event.selections[0].isEmpty && !event.selections[0].isSingleLine) {
          await updateStatusBarItem({
            workspaceCounter, statusBarItem, backgroundToggle,
            selectedText: getSelectedFullLines({ editor: event.textEditor, selections: event.selections })
          });
        } else {
          await updateStatusBarItem({
            workspaceCounter, statusBarItem, backgroundToggle, selectedText: undefined
          });
        }
      }
    ));

  // An Event which fires when the notebook editor selections have changed.
  // subscriptions.push(
  //   vscode.window.onDidChangeNotebookEditorSelection(
  //     async (event: vscode.NotebookEditorSelectionChangeEvent) => {
  //       // only when user select multiple lines, we will show the selected codes and comments
  //       if (event.selections.length > 0 && !event.selections[0].isEmpty) {
  //         await updateStatusBarItem({
  //           workspaceCounter, statusBarItem, backgroundToggle,
  //           selectedText: getSelectedNotebookText({ notebookEditor: event.notebookEditor, selections: event.selections })
  //         });
  //       } else {
  //         await updateStatusBarItem({
  //           workspaceCounter, statusBarItem, backgroundToggle, selectedText: undefined
  //         });
  //       }
  //     },
  //   ),
  // );
}

const lookFile = async (uri: vscode.Uri) => {
  const { workspaceFolder, language } = (await needHandle(uri)) ?? {};
  if (!workspaceFolder || !language) {
    return;
  }

  await workspaceCounter.countWorkspace({
    workspacePath: workspaceFolder.uri.fsPath,
    language,
  });

  // because we only focus on this file, we do not need to re-analzye it
  // only if when we found that we do not have the result
  const fileResult = workspaceCounter.getFileResult({
    workspacePath: workspaceFolder.uri.fsPath,
    language,
    absolutePath: uri.fsPath,
  });
  if (!fileResult) {
    await workspaceCounter.updateFile({
      workspacePath: workspaceFolder.uri.fsPath,
      language,
      absolutePath: uri.fsPath,
    });
  }
};

const saveFile = async (uri: vscode.Uri) => {
  // if uri is .gitignore file, we should update the filter
  if (path.basename(uri.fsPath) === ".gitignore") {
    const workspaceFolder = getWorkspaceFolderFromUri({ uri });
    if (!workspaceFolder) {
      return;
    }
    saveGitIgnore({ workspacePath: workspaceFolder.uri.fsPath });
    return;
  }

  const { workspaceFolder, language } = (await needHandle(uri)) ?? {};
  if (!workspaceFolder || !language) {
    return;
  }

  const isTriggered = await workspaceCounter.countWorkspace({
    workspacePath: workspaceFolder.uri.fsPath,
    language,
  });

  // because we are save the file, if we do not trigger the count workspace
  // we must analyze the file and update the result
  if (!isTriggered) {
    await workspaceCounter.updateFile({
      workspacePath: workspaceFolder.uri.fsPath,
      language,
      absolutePath: uri.fsPath,
    });
  }
};

const saveGitIgnore = async ({ workspacePath }: { workspacePath: string }) => {
  filterManager.deleteFilter({ workspacePath });
  workspaceCounter.deleteWorkspace({
    workspacePath,
  });
};

const deleteFile = async (uri: vscode.Uri) => {
  const r = await needHandle(uri);
  if (!r) {
    return;
  }
  const { workspaceFolder, language } = r;

  workspaceCounter.deleteFile({
    workspacePath: workspaceFolder.uri.fsPath,
    language: language,
    absolutePath: uri.fsPath,
  });
};


const needHandle = async (
  uri: vscode.Uri,
): Promise<
  | {
    workspaceFolder: vscode.WorkspaceFolder;
    language: SupportedLanguage;
  }
  | undefined
> => {

  // if we are in reloading status, do nothing
  if (isReloading) {
    return undefined;
  }

  // vscode.workspace.name
  // Purpose: This property provides the name of the workspace. In the context of VS Code, a "workspace" can refer to a single folder opened in VS Code or a multi-root workspace (which is a collection of folders that are opened in a single VS Code instance).
  // Usage: It is useful when you need to display the name of the current workspace or when you need to differentiate between workspaces in a multi-workspace environment.
  // Return Value: It returns a string representing the name of the workspace. For a single folder, it's the name of that folder. For a multi-root workspace, it's the name of the workspace as defined in the .code-workspace file. If there is no open workspace, it returns undefined.

  const workspaceFolder = getWorkspaceFolderFromUri({ uri });
  if (!workspaceFolder) {
    return undefined;
  }

  const filter = await filterManager.getFilter({
    workspacePath: workspaceFolder.uri.fsPath,
  });
  if (filter.ignores(path.relative(workspaceFolder.uri.fsPath, uri.fsPath))) {
    return undefined;
  }

  const language = getSupportedLanguageFromPath({ path: uri.fsPath });
  if (!language) {
    return undefined;
  }

  return { workspaceFolder, language };
};


// 神奇的是，notebook也是走的这个普通文件的事件
function getSelectedFullLines({ editor, selections }: { editor: vscode.TextEditor, selections: readonly vscode.Selection[] }): string | undefined {
  const document = editor.document;
  const lines = [];
  for (const selection of selections) {
    for (let i = selection.start.line; i <= selection.end.line; i++) {
      lines.push(document.lineAt(i).text);
    }
  }

  return lines.join('\n');
}

// 这个只能一次获得选中的cell的所有内容
// function getSelectedNotebookText({ notebookEditor, selections }: { notebookEditor: vscode.NotebookEditor, selections: readonly vscode.NotebookRange[] }): string {
//   const selectedTexts: string[] = [];

//   for (const range of selections) {
//     const cells = notebookEditor.notebook.getCells().slice(range.start, range.end);
//     for (const cell of cells) {
//       selectedTexts.push(cell.document.getText());
//     }
//   }

//   return selectedTexts.join('\n\n'); // separate cells by blank line
// }


