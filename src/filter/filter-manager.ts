// 2024/7/24
// zhangzhong

import { GitIgnoreFilter, newGitIgnoreFilter } from "./git-ignore-filter";

class FilterManager {
  private filters: { [workspacePath: string]: GitIgnoreFilter } = {};

  async getFilter({
    workspacePath,
  }: {
    workspacePath: string;
  }): Promise<GitIgnoreFilter> {
    if (!(workspacePath in this.filters)) {
      this.filters[workspacePath] = await newGitIgnoreFilter({
        workspacePath,
      });
    }
    return this.filters[workspacePath];
  }

  async deleteFilter({ workspacePath }: { workspacePath: string }) {
    if (workspacePath in this.filters) {
      delete this.filters[workspacePath];
    }
  }
}

export const filterManager = new FilterManager();
