// 2025/10/6
// zhangzhong

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import { newAnalyzer } from "../analyzer/factory";
import {
    getIconFromSupportedLanguage,
    getSupportedLanguageFromPath,
} from "../common/supported-languages";
import { FileResult } from "../common/types";
import { WorkspaceCounter } from "../counter/workspace-counter";
import { getWorkspaceFolderFromUri } from "../utils/file";

import { clearBackground, updateBackground } from "./background";

// we need to analyze the selected text through our analyzer
// so we need the analyzer factory
export function getSelectedCodesAndComments({ text }: { text: string }): FileResult | undefined {

    let path = vscode.window.activeTextEditor?.document.uri.fsPath;
    const language = getSupportedLanguageFromPath({ path: path ?? "" });
    if (!language) { return; }

    // for ipynb file, cause we only analyze the code cells, so change the path to a fake py file
    if (path?.endsWith(".ipynb")) {
        path = path.replace(/\.ipynb$/, ".py");
    }
    const analyzer = newAnalyzer({ text, language, absolutePath: path! });
    return analyzer?.analyze();
}


// 可以在这里再加上一个字段，表示selected text
export async function updateStatusBarItem({ workspaceCounter, statusBarItem, backgroundToggle, selectedText }: { workspaceCounter: WorkspaceCounter, statusBarItem: vscode.StatusBarItem, backgroundToggle: boolean, selectedText: string | undefined }): Promise<void> {
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

    if (selectedText && selectedText.length > 0) {
        const selectedResult = getSelectedCodesAndComments({ text: selectedText });
        if (selectedResult) {
            statusBarItem.text = `$(${getIconFromSupportedLanguage({ language })}) Selected Codes: ${selectedResult.codes}, Annos: ${selectedResult.comments}`;
        }
    } else {
        statusBarItem.text = `$(${getIconFromSupportedLanguage({ language })}) Codes: ${fileResult.codes}/${totalCodes}, Annos: ${fileResult.comments}/${totalComments}`;
    }
    statusBarItem.show();

    clearBackground({ editor });
    updateBackground({ editor, result: fileResult, backgroundToggle });
}

