// 2024/9/19
// zhangzhong

// eslint-disable-next-line import/no-unresolved
import * as vscode from "vscode";

let outputChannel: vscode.OutputChannel;

export const activateOutputChannel = (name: string): void => {
  // https://code.visualstudio.com/api/references/vscode-api#OutputChannel
  outputChannel = vscode.window.createOutputChannel(name);
};

export const disposeOutputChannel = (): void => {
  // Clean up resources if necessary
  if (outputChannel) {
    outputChannel.dispose();
  }
};

/**
 * Prints the given content on the output channel.
 *
 * @param content The content to be printed.
 * @param reveal Whether the output channel should be revealed.
 */
export const printToChannelOutput = (content: string, reveal = false): void => {
  outputChannel.appendLine(content);
  if (reveal) {
    outputChannel.show(true);
  }
};
