const path = require("path");
const fetch = require('make-fetch-happen');

module.exports = class GithubAPI {
  cacheDir;
  auth;

  constructor(config = {}) {
    config.cacheDir = '.changelog';
    this.cacheDir = config.cacheDir && path.join(process.cwd(), config.cacheDir, "github");
    this.auth = process.env.GITHUB_AUTH || "";
    if (!this.auth) {
      throw new Error("Must provide GITHUB_AUTH as a ENV variable");
    }
  }

  async getIssueData(repo, issue) {
    const url = `https://api.github.com/repos/${repo}/issues/${issue}`;

    const res = await fetch(url, {
      cacheManager: this.cacheDir,
      headers: {
        Authorization: `token ${this.auth}`,
      },
    });
    const parsedResponse = await res.json();
    if (res.ok) {
      return parsedResponse;
    }
    throw new ConfigurationError(`Fetch error: ${res.statusText}.\n${JSON.stringify(parsedResponse)}`);
  }
}
