# Contributing

Thank you for helping make the catalog more accurate and useful.

## Data corrections

The files under `data/`, `catalog/`, `indexes/`, `changes/`, and `stats.json`
are generated from ImgLume's public export. Direct edits will be overwritten.

For an author, source URL, prompt, category, tag, model, or media correction:

1. open a source-correction issue;
2. include the record ID and original X post URL;
3. explain the requested change and provide supporting evidence;
4. avoid posting private personal information.

After the source record is corrected in ImgLume, the daily synchronization will
publish the change here.

## Taxonomy and tooling

Pull requests are welcome for:

- category and schema proposals;
- documentation improvements;
- synchronization and validation tooling;
- accessibility and browsing improvements.

Run these checks before opening a pull request:

```sh
npm run check
```

Contributors must have the right to submit their own code or documentation.
Do not add a license claim for third-party prompt text or media without
verifiable evidence from the rights holder.
