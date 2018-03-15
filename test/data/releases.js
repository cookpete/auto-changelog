export default [
  {
    "commits": [
      {
        "hash": "b0b304049847d9568585bc11399fa6cfa4cab5dc",
        "shorthash": "b0b3040",
        "author": "Pete Cook",
        "email": "email@example.com",
        "date": "2015-12-29T21:57:19.000Z",
        "tag": null,
        "subject": "Some breaking change",
        "message": "Some breaking change",
        "fixes": null,
        "merge": null,
        "href": "https://github.com/user/repo/commit/b0b304049847d9568585bc11399fa6cfa4cab5dc",
        "files": 5,
        "insertions": 10,
        "deletions": 10
      }
    ],
    "fixes": [],
    "merges": [],
    "tag": "v1.0.0",
    "date": "2015-12-15T12:03:09.000Z",
    "title": "v1.0.0",
    "niceDate": "15 December 2015",
    "isoDate": "2015-12-15",
    "href": "https://github.com/user/repo/compare/v0.1.0...v1.0.0",
    "major": true
  },
  {
    "commits": [
      {
        "hash": "12c0624e7e419a70bd5f3b403d7e0bd8f23ec617",
        "shorthash": "12c0624",
        "author": "Pete Cook",
        "email": "email@example.com",
        "date": "2015-12-29T21:18:19.000Z",
        "tag": null,
        "subject": "Commit that fixes nothing",
        "message": "Commit that fixes nothing",
        "fixes": null,
        "merge": null,
        "href": "https://github.com/user/repo/commit/12c0624e7e419a70bd5f3b403d7e0bd8f23ec617",
        "files": 1,
        "insertions": 2,
        "deletions": 3
      },
      {
        "hash": "e9a43b2bf50449fc0d84465308e6008cc1597bb3",
        "shorthash": "e9a43b2",
        "author": "Pete Cook",
        "email": "email@example.com",
        "date": "2015-12-29T21:19:19.000Z",
        "tag": null,
        "subject": "Another commit that fixes nothing but with less changes",
        "message": "Another commit that fixes nothing but with less changes",
        "fixes": null,
        "merge": null,
        "href": "https://github.com/user/repo/commit/e9a43b2bf50449fc0d84465308e6008cc1597bb3",
        "files": 1,
        "insertions": 1,
        "deletions": 1
      }
    ],
    "fixes": [],
    "merges": [],
    "tag": "v0.1.0",
    "date": "2015-12-29T21:19:17.000Z",
    "title": "v0.1.0",
    "niceDate": "29 December 2015",
    "isoDate": "2015-12-29",
    "href": "https://github.com/user/repo/compare/v0.0.2...v0.1.0",
    "major": false
  },
  {
    "commits": [],
    "fixes": [
      {
        "fixes": [
          {
            "id": "4",
            "href": "https://github.com/user/repo/issues/4"
          }
        ],
        "commit": {
          "hash": "17fbef87e82889f01d8257900f7edc55b05918a2",
          "shorthash": "17fbef8",
          "author": "Pete Cook",
          "email": "email@example.com",
          "date": "2015-12-28T11:35:54.000Z",
          "tag": null,
          "subject": "Commit 4 fixes #4 in the subject",
          "message": "Commit 4 fixes #4 in the subject\n\nWith some extra notes here",
          "fixes": [
            {
              "id": "4",
              "href": "https://github.com/user/repo/issues/4"
            }
          ],
          "merge": null,
          "href": "https://github.com/user/repo/commit/17fbef87e82889f01d8257900f7edc55b05918a2",
          "files": 1,
          "insertions": 1,
          "deletions": 0
        }
      }
    ],
    "merges": [
      {
        "id": "5",
        "message": "Should not parse #4 in PR title",
        "href": "https://github.com/user/repo/pull/5"
      }
    ],
    "tag": "v0.0.2",
    "date": "2015-12-28T21:17:17.000Z",
    "title": "v0.0.2",
    "niceDate": "28 December 2015",
    "isoDate": "2015-12-28",
    "href": "https://github.com/user/repo/compare/v0.0.1...v0.0.2",
    "major": false
  },
  {
    "commits": [
      {
        "hash": "158fdde54b6188c9f9ca3034e9cb5bcc3fe3ff69",
        "shorthash": "158fdde",
        "author": "Pete Cook",
        "email": "email@example.com",
        "date": "2015-12-14T17:06:12.000Z",
        "tag": null,
        "subject": "First commit",
        "message": "First commit",
        "fixes": null,
        "merge": null,
        "href": "https://github.com/user/repo/commit/158fdde54b6188c9f9ca3034e9cb5bcc3fe3ff69",
        "files": 7,
        "insertions": 37,
        "deletions": 22
      }
    ],
    "fixes": [
      {
        "fixes": [
          {
            "id": "1",
            "href": "https://github.com/user/repo/issues/1"
          },
          {
            "id": "2",
            "href": "https://github.com/user/repo/issues/2"
          }
        ],
        "commit": {
          "hash": "90ef33485369fc7892d11b2e4da04ffb64df1e99",
          "shorthash": "90ef334",
          "author": "Pete Cook",
          "email": "email@example.com",
          "date": "2015-12-15T11:31:06.000Z",
          "tag": null,
          "subject": "Second commit",
          "message": "Second commit\n\nResolves #1 and fixes https://github.com/user/repo/issues/2",
          "fixes": [
            {
              "id": "1",
              "href": "https://github.com/user/repo/issues/1"
            },
            {
              "id": "2",
              "href": "https://github.com/user/repo/issues/2"
            }
          ],
          "merge": null,
          "href": "https://github.com/user/repo/commit/90ef33485369fc7892d11b2e4da04ffb64df1e99",
          "files": 8,
          "insertions": 57,
          "deletions": 53
        }
      }
    ],
    "merges": [
      {
        "id": "3",
        "message": "Third commit with same name as PR",
        "href": "https://github.com/user/repo/pull/3"
      }
    ],
    "tag": "v0.0.1",
    "date": "2015-12-15T12:03:09.000Z",
    "title": "v0.0.1",
    "niceDate": "15 December 2015",
    "isoDate": "2015-12-15"
  }
]