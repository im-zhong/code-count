// 2024/7/24
// zhangzhong

import * as vscode from "vscode";
import { GitIgnoreFilter, newGitIgnoreFilter } from "./git-ignore-filter";

// 我们需要一个filter的manager
// 这个manager会帮助我们维护一个filter
class FilterManager {
  private filters: { [key: string]: GitIgnoreFilter } = {};
  async getFilter({
    workspace,
  }: {
    workspace: vscode.WorkspaceFolder;
  }): Promise<GitIgnoreFilter> {
    if (!(workspace.name in this.filters)) {
      this.filters[workspace.name] = await newGitIgnoreFilter({
        folder: workspace,
      });
    }
    return this.filters[workspace.name];
  }

  async deleteFilter({ workspaceName }: { workspaceName: string }) {
    if (workspaceName in this.filters) {
      delete this.filters[workspaceName];
    }
  }
}

export const filterManager = new FilterManager();
