// 2025/10/6
// zhangzhong
// REFACTOR: move all file related utils here

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

export const getWorkspaceFolderFromUri = ({
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
