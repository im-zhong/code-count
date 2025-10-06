// 2025/10/6
// zhangzhong
// REFACTOR: 当加载插件的时候，也会第一次加载大量的文件，这个时候点击其他的文件也会触发类似的问题，也可以用isReloading来处理
// 咱们将这两处逻辑合并即可

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

import { SupportedLanguage } from "../common/supported-languages";
import { WorkspaceCounter } from "../counter/workspace-counter";
import { updateStatusBarItem } from "../display/status";


// 还需要新增加一个reloding的状态
// 在reload时，所有的事件都不会触发

export let isReloading = false;

// - Objects and arrays are passed by reference to the function, meaning the function gets a reference to the same object.
// - Primitives (number, string, boolean, symbol, bigint) are passed by value.
export async function reload({
    workspaceFolders,
    workspaceCounter,
    statusBarItem,
    backgroundToggle,
}: {
    workspaceFolders: readonly vscode.WorkspaceFolder[];
    workspaceCounter: WorkspaceCounter;
    statusBarItem: vscode.StatusBarItem;
    backgroundToggle: boolean;
}) {
    isReloading = true;

    // do nothing for now
    // show a message

    // enumerate all the languages
    // statusBarItem.text = `$(sync~spin) Reloading...`;
    // statusBarItem.show();

    statusBarItem.hide();

    // REFACTOR: 目前counter和那个loading的status item是耦合的
    workspaceCounter.clearWorkspaceResults();
    for (const workspaceFolder of workspaceFolders) {
        for (const language of Object.values(SupportedLanguage)) {
            await workspaceCounter.countWorkspace({ workspacePath: workspaceFolder.uri.fsPath, language });
        }
    }

    // statusBarItem.text = `$(check) Reloaded`;
    // setTimeout(() => {
    //     statusBarItem.hide();
    // }, 3000);
    await updateStatusBarItem({ workspaceCounter, statusBarItem, backgroundToggle, selectedText: undefined });
    vscode.window.showInformationMessage("Code Counter Reloaded.");

    isReloading = false;
    return;
}