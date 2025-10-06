// 2025/10/6



// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import { FileResult, LineClass } from "../common/types";


// https://github.com/microsoft/vscode-extension-samples/issues/22
// decorationType should be created only once
export const codeDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(0,255,0,0.3)",
});
const commentDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255,0,0,0.3)",
});
const codeCommentDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(0,0,255,0.3)",
});



export function clearBackground({ editor }: { editor: vscode.TextEditor }) {
    editor.setDecorations(codeDecorationType, []);
    editor.setDecorations(commentDecorationType, []);
    editor.setDecorations(codeCommentDecorationType, []);
}

export function updateBackground({
    editor,
    result,
    backgroundToggle
}: {
    editor: vscode.TextEditor;
    result: FileResult;
    backgroundToggle: boolean;
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
