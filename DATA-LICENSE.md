# Dataset rights and reuse

Visual Prompt Feed separates third-party source material from ImgLume's own
curation. This distinction applies record by record.

## Original prompt text and source media

The following fields may contain or point to third-party material:

- `prompt`;
- `source`, including the source post, author identity, and engagement data;
- `media`, including images, videos, posters, and source URLs.

ImgLume marks these materials `NOASSERTION`. That means this dataset makes no
claim that ImgLume owns them or can grant a license for them. Rights remain
with the original authors or other rights holders. A public X post is evidence
of public availability, not automatically a license for unrestricted reuse.

Each record preserves:

- the original author handle;
- the original X post URL and post ID;
- a rights-holder label;
- `source.license: "NOASSERTION"`;
- `media[].license: "NOASSERTION"`.

Anyone reusing those materials is responsible for determining whether their
use is authorized by a license, permission, an applicable exception or
limitation, or other law.

## ImgLume curation

ImgLume licenses its original, protectable contributions under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), including:

- discovery and verification metadata;
- categorization and tags;
- recommended-model and compatibility annotations;
- selection, organization, and dataset structure.

Where facts or individual metadata values are not protected by copyright, the
license still communicates ImgLume's intended permission for any rights it may
hold, including applicable database rights.

Recommended attribution:

> ImgLume — https://imglume.com — CC BY 4.0

When redistributing complete records, retain both ImgLume attribution and the
record's source author, source URL, and `NOASSERTION` notices.

## Code

The scripts and workflow code are available under the
[MIT License](LICENSE-CODE).

## No warranty

The dataset is provided as-is. Licensing, attribution, source availability,
and factual metadata can change. This document describes the repository's
rights model and is not legal advice.
