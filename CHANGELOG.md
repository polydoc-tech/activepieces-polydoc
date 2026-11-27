# Changelog

This file starts at 0.1.3. The changes of earlier versions are in the git history between
the version tags (https://github.com/polydoc-tech/activepieces-polydoc/tags). 0.1.0 is on
npm without a tag. Dates are the npm publish date, in UTC.

## 0.1.3 - 2026-06-18

- The advanced options JSON is merged into the request without its `__proto__`,
  `constructor` and `prototype` keys, a guard against prototype pollution.
- A custom viewport needs both width and height. One without the other stops the action
  with an error, where before the viewport was dropped without a word.
- A binary delivery whose response body is not file bytes stops the action with an error,
  where before it returned an empty file.
- A failed API key check says whether the API returned an HTTP status or could not be
  reached.
