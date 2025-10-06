// 2024/7/24
// zhangzhong

// TIP: we count codes lazily, which means we only count the workspace when user interact
// with a file in that workspace, and only consider one language in each counting process

import path from "path";

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import { summarize } from "./command/summarize";
import {
  getIconFromSupportedLanguage,
  getSupportedLanguageFromPath,
  SupportedLanguage,
} from "./common/supported-languages";
import { LineClass, FileResult } from "./common/types";
import { WorkspaceCounter } from "./counter/workspace-counter";
import { filterManager } from "./filter/filter-manager";
import { registerLoadingStatusBarItem } from "./utils/loading-status-bar-item";
import { activateOutputChannel } from "./utils/output-channel";

let statusBarItem: vscode.StatusBarItem;
let workspaceCounter = new WorkspaceCounter();

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
      updateStatusBarItem();
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
        await updateStatusBarItem();
      },
    ),
  );
  // Notebok Editor and Text Editor use different event to trigger
  vscode.window.onDidChangeActiveNotebookEditor(
    async (notebookEditor: vscode.NotebookEditor | undefined) => {
      if (notebookEditor) {
        await lookFile(notebookEditor.notebook.uri);
      }
      await updateStatusBarItem();
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
        await updateStatusBarItem();
      },
    ),
  );
  subscriptions.push(
    vscode.workspace.onDidSaveNotebookDocument(
      async (document: vscode.NotebookDocument) => {
        await saveFile(document.uri);
        await updateStatusBarItem();
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

const getWorkspaceFolderFromUri = ({
  uri,
}: {
  uri: vscode.Uri;
}): vscode.WorkspaceFolder | undefined => {
  // Jupyter Notebook URIs are handled differently compared to regular file URIs in Visual Studio Code
  let workspaceFolder: vscode.WorkspaceFolder | undefined = undefined;
  // vscode.workspace.notebookDocuments: All notebook documents currently known to the editor.
  const notebookDocument = vscode.workspace.notebookDocuments.find(
    (doc) => doc.uri.fsPath === uri.fsPath,
  );
  if (notebookDocument) {
    // vscode.workspace.getWorkspaceFolder(editor.document.uri)
    // Purpose: This function is used to retrieve the workspace folder that contains a given file. In a multi-root workspace, this is particularly useful because it allows you to determine which of the multiple folders a file belongs to.
    // Usage: It is used when you need to perform operations relative to the folder containing a file, such as resolving relative paths or applying folder-specific configurations.
    // Parameters: It takes a Uri object representing the file's location.
    // Return Value: It returns a WorkspaceFolder object that contains information about the workspace folder, such as its uri, name, and index. If the file is not contained in any workspace folder, it returns undefined.
    workspaceFolder = vscode.workspace.getWorkspaceFolder(notebookDocument.uri);
  } else {
    workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
  }
  return workspaceFolder;
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

async function updateStatusBarItem(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    statusBarItem.hide();
    return;
  }

  const workspaceFolder = getWorkspaceFolderFromUri({
    uri: editor.document.uri,
  });
  if (!workspaceFolder) {
    statusBarItem.hide();
    return;
  }

  const language = getSupportedLanguageFromPath({
    path: editor.document.uri.fsPath,
  });
  if (!language) {
    statusBarItem.hide();
    return;
  }

  const fileResult = workspaceCounter.getFileResult({
    workspacePath: workspaceFolder.uri.fsPath,
    language,
    absolutePath: editor.document.uri.fsPath,
  });
  if (!fileResult) {
    statusBarItem.hide();
    return;
  }

  const { totalCodes, totalComments } =
    workspaceCounter.getTotalCodesAndComments({
      workspacePath: workspaceFolder.uri.fsPath,
      language,
    });

  statusBarItem.text = `$(${getIconFromSupportedLanguage({ language })}) Codes: ${fileResult.codes}/${totalCodes}, Annos: ${fileResult.comments}/${totalComments}`;
  statusBarItem.show();

  clearBackground({ editor });
  updateBackground({ editor, result: fileResult });
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
      new vscode.Position(lineNo, editor.document.lineAt(lineNo).text.length),
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
