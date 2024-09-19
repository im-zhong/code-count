// 2024/9/19
// zhangzhong

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

let loadingStatusBarItem: vscode.StatusBarItem;

export function registerLoadingStatusBarItem(): vscode.StatusBarItem {
  loadingStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10,
  );
  // loadingStatusBarItem.text = "$(loading~spin) Code Counting...";
  // loadingStatusBarItem.tooltip = "Loading...";
  return loadingStatusBarItem;
}

export function getLoadingStatusBarItem(): vscode.StatusBarItem {
  return loadingStatusBarItem;
}
