// 2025/10/6
// zhangzhong



// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import {
    getIconFromSupportedLanguage,
    getSupportedLanguageFromPath,
} from "../common/supported-languages";
import { WorkspaceCounter } from "../counter/workspace-counter";
import { getWorkspaceFolderFromUri } from "../utils/file";

import { clearBackground, updateBackground } from "./background";



export async function updateStatusBarItem({ workspaceCounter, statusBarItem, backgroundToggle }: { workspaceCounter: WorkspaceCounter, statusBarItem: vscode.StatusBarItem, backgroundToggle: boolean }): Promise<void> {
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
    updateBackground({ editor, result: fileResult, backgroundToggle });
}

