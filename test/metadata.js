const { describe, it, beforeEach, afterEach } = require("mocha");
const { expect } = require("chai");

const {
  getMetadata,
  __Rewire__: mock,
  __ResetDependency__: unmock,
} = require("../src/metadata");

describe("metadata", () => {
  beforeEach(() => {
    mock("niceDate", () => "20 January 2021");
    mock("fetchGitConfig", () => {
      return {
        user: { name: "John Doe", email: "John.Doe@domain.com" },
        core: {
          editor: "nano",
        },
      };
    });
    mock("readJson", () => {
      return {
        version: "1.0.0",
        name: "my-repository",
        description: "description-repository",
      };
    });
  });

  afterEach(() => {
    unmock("niceDate");
    unmock("readJson");
    unmock("fetchGitConfig");
  });

  it("should return data from git config and package json if metadata option is true", async () => {   
    expect(await getMetadata({ metadata: true })).to.deep.equal({
      now: "20 January 2021",
      version: "1.0.0",
      name: "my-repository",
      description: "description-repository",
      user: { name: "John Doe", email: "John.Doe@domain.com" },
      core: {
        editor: "nano",
      },
    });
  });

  it("should return an empty object if metadata option is undefined or false", async () => {
    expect(await getMetadata({})).to.deep.equal({});
    expect(await getMetadata({metadata:false})).to.deep.equal({});
    expect(await getMetadata({metadata: 'true'})).to.deep.equal({});
  });
});
