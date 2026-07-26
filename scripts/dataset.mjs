import { createHash } from 'node:crypto';

export const SCHEMA_VERSION = 'imglume.open-prompts.v1';
export const CURATION_LICENSE = 'CC-BY-4.0';
export const SOURCE_LICENSE = 'NOASSERTION';
export const DEFAULT_API_URL =
  'https://imglume.com/api/open-prompts/v1/prompts';

const EXPECTED_CURATION_CONTRIBUTIONS = [
  'discovery',
  'verification',
  'categorization',
  'tagging',
  'model compatibility',
  'dataset structure',
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function assertIsoDate(value, label) {
  assert(isNonEmptyString(value), `${label} must be a non-empty string`);
  assert(
    Number.isFinite(Date.parse(value)),
    `${label} must be an ISO-compatible date`,
  );
}

function assertStringArray(value, label, { nonEmpty = false } = {}) {
  assert(Array.isArray(value), `${label} must be an array`);
  if (nonEmpty) {
    assert(value.length > 0, `${label} must not be empty`);
  }
  for (const item of value) {
    assert(isNonEmptyString(item), `${label} must contain non-empty strings`);
  }
}

export function normalizePrompt(prompt) {
  return prompt.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

export function recordFingerprint(record) {
  return createHash('sha256').update(JSON.stringify(record)).digest('hex');
}

export function validateApiDataset(dataset) {
  assert(isObject(dataset), 'dataset metadata must be an object');
  assert(dataset.name === 'ImgLume Open Prompts', 'unexpected dataset name');
  assert(isNonEmptyString(dataset.url), 'dataset.url is required');
  assert(isNonEmptyString(dataset.scope), 'dataset.scope is required');
  assert(isObject(dataset.licensing), 'dataset.licensing is required');
  assert(
    dataset.licensing.curation?.license === CURATION_LICENSE,
    `dataset curation license must be ${CURATION_LICENSE}`,
  );
  assert(
    dataset.licensing.curation?.licensor === 'ImgLume',
    'dataset curation licensor must be ImgLume',
  );
  assert(
    dataset.licensing.promptTextAndSourceMedia?.license === SOURCE_LICENSE,
    `dataset source-material license must be ${SOURCE_LICENSE}`,
  );
}

export function validateRecord(record, index = 0) {
  const label = `items[${index}]`;

  assert(isObject(record), `${label} must be an object`);
  assert(
    /^byradar:\d+:\d+$/.test(record.id),
    `${label}.id must be a ByRadar record ID`,
  );
  assert(
    Number.isInteger(record.imglumeId) && record.imglumeId > 0,
    `${label}.imglumeId must be a positive integer`,
  );
  assert(
    /^[a-f0-9]{64}$/.test(record.revision),
    `${label}.revision must be a SHA-256 hash`,
  );
  assert(isNonEmptyString(record.title), `${label}.title is required`);
  assert(isNonEmptyString(record.prompt), `${label}.prompt is required`);
  assert(
    record.mediaType === 'image' || record.mediaType === 'video',
    `${label}.mediaType must be image or video`,
  );
  assert(
    isNonEmptyString(record.recommendedModel),
    `${label}.recommendedModel is required`,
  );
  assertStringArray(record.sourceModels, `${label}.sourceModels`, {
    nonEmpty: true,
  });
  assertStringArray(record.categories, `${label}.categories`, {
    nonEmpty: true,
  });
  assertStringArray(record.tags, `${label}.tags`);
  if (record.language !== null) {
    assert(
      isNonEmptyString(record.language),
      `${label}.language must be null or a non-empty string`,
    );
  }
  assert(isObject(record.recommended), `${label}.recommended is required`);

  assert(isObject(record.source), `${label}.source is required`);
  assert(record.source.platform === 'x', `${label}.source.platform must be x`);
  assert(
    /^\d+$/.test(record.source.postId),
    `${label}.source.postId must be numeric`,
  );
  assert(
    isNonEmptyString(record.source.url),
    `${label}.source.url is required`,
  );
  const sourceUrl = new URL(record.source.url);
  assert(
    sourceUrl.hostname === 'x.com' || sourceUrl.hostname === 'www.x.com',
    `${label}.source.url must use x.com`,
  );
  assert(
    sourceUrl.pathname.includes(`/status/${record.source.postId}`),
    `${label}.source.url must match source.postId`,
  );
  assert(
    isObject(record.source.author),
    `${label}.source.author is required`,
  );
  assert(
    isNonEmptyString(record.source.author.handle),
    `${label}.source.author.handle is required`,
  );
  if (record.source.author.name !== null) {
    assert(
      isNonEmptyString(record.source.author.name),
      `${label}.source.author.name must be null or a non-empty string`,
    );
  }
  if (record.source.publishedAt !== null) {
    assertIsoDate(record.source.publishedAt, `${label}.source.publishedAt`);
  }
  assertIsoDate(record.source.discoveredAt, `${label}.source.discoveredAt`);
  assert(
    isNonEmptyString(record.source.attribution),
    `${label}.source.attribution is required`,
  );
  assert(
    record.source.license === SOURCE_LICENSE,
    `${label}.source.license must be ${SOURCE_LICENSE}`,
  );
  assert(
    isNonEmptyString(record.source.rightsHolder),
    `${label}.source.rightsHolder is required`,
  );

  assert(Array.isArray(record.media), `${label}.media must be an array`);
  for (const [mediaIndex, media] of record.media.entries()) {
    const mediaLabel = `${label}.media[${mediaIndex}]`;
    assert(isObject(media), `${mediaLabel} must be an object`);
    assert(
      media.type === 'image' || media.type === 'video',
      `${mediaLabel}.type must be image or video`,
    );
    assert(isNonEmptyString(media.role), `${mediaLabel}.role is required`);
    assert(
      isNonEmptyString(media.previewUrl),
      `${mediaLabel}.previewUrl is required`,
    );
    assert(
      media.license === SOURCE_LICENSE,
      `${mediaLabel}.license must be ${SOURCE_LICENSE}`,
    );
    assert(
      isNonEmptyString(media.rightsHolder),
      `${mediaLabel}.rightsHolder is required`,
    );
  }

  assert(isObject(record.curation), `${label}.curation is required`);
  assert(
    record.curation.creator === 'ImgLume',
    `${label}.curation.creator must be ImgLume`,
  );
  assert(
    record.curation.license === CURATION_LICENSE,
    `${label}.curation.license must be ${CURATION_LICENSE}`,
  );
  assert(
    isNonEmptyString(record.curation.recordUrl),
    `${label}.curation.recordUrl is required`,
  );
  assertStringArray(
    record.curation.contributions,
    `${label}.curation.contributions`,
    { nonEmpty: true },
  );
  for (const contribution of EXPECTED_CURATION_CONTRIBUTIONS) {
    assert(
      record.curation.contributions.includes(contribution),
      `${label}.curation.contributions is missing "${contribution}"`,
    );
  }

  assert(isObject(record.provenance), `${label}.provenance is required`);
  assert(
    record.provenance.discoveredBy === 'ByRadar',
    `${label}.provenance.discoveredBy must be ByRadar`,
  );
  assert(
    record.provenance.collection === 'byradar_discovered',
    `${label}.provenance.collection must be byradar_discovered`,
  );
  assertIsoDate(record.provenance.importedAt, `${label}.provenance.importedAt`);
  assertIsoDate(record.provenance.updatedAt, `${label}.provenance.updatedAt`);
}

export function validateRecords(records) {
  assert(Array.isArray(records), 'items must be an array');
  assert(records.length > 0, 'refusing to publish an empty dataset');

  const ids = new Set();
  const imglumeIds = new Set();
  const promptHashes = new Map();

  for (const [index, record] of records.entries()) {
    validateRecord(record, index);
    assert(!ids.has(record.id), `duplicate record ID: ${record.id}`);
    assert(
      !imglumeIds.has(record.imglumeId),
      `duplicate ImgLume ID: ${record.imglumeId}`,
    );

    const promptHash = createHash('sha256')
      .update(normalizePrompt(record.prompt))
      .digest('hex');
    const duplicate = promptHashes.get(promptHash);
    assert(
      duplicate === undefined,
      `duplicate normalized prompt: ${duplicate} and ${record.id}`,
    );

    ids.add(record.id);
    imglumeIds.add(record.imglumeId);
    promptHashes.set(promptHash, record.id);
  }
}

export function sortRecords(records) {
  return [...records].sort(
    (left, right) =>
      left.imglumeId - right.imglumeId || left.id.localeCompare(right.id),
  );
}

export function latestDatasetDate(records) {
  return records
    .map((record) => record.provenance.updatedAt)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}

export function buildEnvelope(dataset, records) {
  validateApiDataset(dataset);
  validateRecords(records);

  const sortedRecords = sortRecords(records);
  return {
    schemaVersion: SCHEMA_VERSION,
    dataset,
    generatedAt: latestDatasetDate(sortedRecords),
    count: sortedRecords.length,
    items: sortedRecords,
  };
}

function sortedObject(entries) {
  return Object.fromEntries(
    [...entries].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function trimLineEndWhitespace(value) {
  return value.replace(/[ \t]+$/gmu, '');
}

export function buildStats(envelope) {
  const categoryCounts = new Map();
  const modelCounts = new Map();
  const languageCounts = new Map();
  const sourceModelCounts = new Map();
  const authors = new Set();
  const sourcePosts = new Set();
  let image = 0;
  let video = 0;
  let mediaAssets = 0;

  for (const record of envelope.items) {
    if (record.mediaType === 'image') {
      image += 1;
    } else {
      video += 1;
    }
    mediaAssets += record.media.length;
    authors.add(record.source.author.handle.toLowerCase());
    sourcePosts.add(record.source.postId);

    const model = record.recommendedModel;
    modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
    const language = record.language ?? 'unknown';
    languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
    for (const sourceModel of record.sourceModels) {
      sourceModelCounts.set(
        sourceModel,
        (sourceModelCounts.get(sourceModel) ?? 0) + 1,
      );
    }
    for (const category of record.categories) {
      const counts = categoryCounts.get(category) ?? {
        total: 0,
        image: 0,
        video: 0,
      };
      counts.total += 1;
      counts[record.mediaType] += 1;
      categoryCounts.set(category, counts);
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: envelope.generatedAt,
    total: envelope.count,
    mediaTypes: { image, video },
    authors: authors.size,
    sourcePosts: sourcePosts.size,
    mediaAssets,
    categories: sortedObject(categoryCounts),
    recommendedModels: sortedObject(modelCounts),
    sourceModels: sortedObject(sourceModelCounts),
    languages: sortedObject(languageCounts),
  };
}

function csvCell(value) {
  const untrimmedText =
    value === null || value === undefined
      ? ''
      : Array.isArray(value)
        ? value.join('|')
        : String(value);
  const text = trimLineEndWhitespace(untrimmedText);
  return `"${text.replaceAll('"', '""')}"`;
}

export function toCsv(records) {
  const columns = [
    'id',
    'imglume_id',
    'revision',
    'title',
    'prompt',
    'media_type',
    'recommended_model',
    'source_models',
    'categories',
    'tags',
    'language',
    'source_author_handle',
    'source_author_name',
    'source_post_url',
    'source_post_id',
    'source_published_at',
    'source_license',
    'source_rights_holder',
    'curation_record_url',
    'curation_license',
    'imported_at',
    'updated_at',
    'preview_urls',
  ];
  const rows = records.map((record) => [
    record.id,
    record.imglumeId,
    record.revision,
    record.title,
    record.prompt,
    record.mediaType,
    record.recommendedModel,
    record.sourceModels,
    record.categories,
    record.tags,
    record.language,
    record.source.author.handle,
    record.source.author.name,
    record.source.url,
    record.source.postId,
    record.source.publishedAt,
    record.source.license,
    record.source.rightsHolder,
    record.curation.recordUrl,
    record.curation.license,
    record.provenance.importedAt,
    record.provenance.updatedAt,
    record.media.map((media) => media.previewUrl),
  ]);

  return [
    columns.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ].join('\n').concat('\n');
}

export function toJsonl(records) {
  return records.map((record) => JSON.stringify(record)).join('\n').concat('\n');
}

export function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function displayName(value) {
  const knownNames = {
    gptimage: 'GPT Image',
    nanobanana: 'Nano Banana',
    seedance: 'Seedance',
    ugc: 'UGC',
  };
  return (
    knownNames[value] ??
    value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  );
}

function htmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function markdownEscape(value) {
  return value.replaceAll('\\', '\\\\').replaceAll('[', '\\[').replaceAll(']', '\\]');
}

function buildCatalogRecord(record) {
  const authorLabel = record.source.author.name
    ? `${record.source.author.name} (@${record.source.author.handle})`
    : `@${record.source.author.handle}`;
  const previewLinks = record.media
    .map(
      (media, index) =>
        `[${index + 1}](${media.previewUrl} "${markdownEscape(media.altText)}")`,
    )
    .join(' · ');

  return [
    `## ${markdownEscape(record.title)}`,
    '',
    `- **Original source:** [${markdownEscape(authorLabel)} on X](${record.source.url})`,
    `- **Recommended model:** \`${record.recommendedModel}\``,
    `- **Source model(s):** ${record.sourceModels.map((model) => `\`${model}\``).join(', ')}`,
    `- **Categories:** ${record.categories.map((category) => `\`${category}\``).join(', ')}`,
    `- **ImgLume record:** [${record.imglumeId}](${record.curation.recordUrl})`,
    `- **Source media:** ${previewLinks || 'None'}`,
    `- **Rights:** prompt text and source media \`${SOURCE_LICENSE}\`; ImgLume curation \`${CURATION_LICENSE}\``,
    '',
    '<details>',
    '<summary>Full prompt</summary>',
    '',
    `<pre><code>${htmlEscape(trimLineEndWhitespace(record.prompt))}</code></pre>`,
    '',
    '</details>',
    '',
  ].join('\n');
}

function groupRecords(records, keySelector) {
  const groups = new Map();
  for (const record of records) {
    for (const key of keySelector(record)) {
      const values = groups.get(key) ?? [];
      values.push(record);
      groups.set(key, values);
    }
  }
  return groups;
}

function buildCatalogFiles(records) {
  const files = new Map();

  for (const mediaType of ['image', 'video']) {
    const typeRecords = records.filter(
      (record) => record.mediaType === mediaType,
    );
    const groups = groupRecords(typeRecords, (record) => record.categories);
    const categoryRows = [...groups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([category, values]) =>
          `| [${displayName(category)}](./${category}.md) | ${values.length} |`,
      );

    files.set(
      `catalog/${mediaType}/README.md`,
      [
        `# ${displayName(mediaType)} prompt catalog`,
        '',
        `Browse ${typeRecords.length} source-linked ${mediaType} prompts by category.`,
        '',
        '| Category | Prompts |',
        '| --- | ---: |',
        ...categoryRows,
        '',
        'Prompt text and source media are `NOASSERTION`. ImgLume curation is',
        'licensed under CC BY 4.0. See [DATA-LICENSE.md](../../DATA-LICENSE.md).',
        '',
      ].join('\n'),
    );

    for (const [category, values] of groups) {
      const newestFirst = [...values].sort(
        (left, right) => right.imglumeId - left.imglumeId,
      );
      files.set(
        `catalog/${mediaType}/${category}.md`,
        [
          `# ${displayName(category)} ${mediaType} prompts`,
          '',
          `${newestFirst.length} source-linked prompts, newest ImgLume records first.`,
          '',
          'Prompt text and source media are `NOASSERTION`. Rights remain with',
          'their original authors. ImgLume curation is CC BY 4.0.',
          '',
          ...newestFirst.map(buildCatalogRecord),
        ].join('\n'),
      );
    }
  }

  return files;
}

function buildIndexFiles(records) {
  const files = new Map();
  const categoryGroups = groupRecords(records, (record) => record.categories);
  const modelGroups = groupRecords(records, (record) => [
    record.recommendedModel,
  ]);

  for (const [category, values] of categoryGroups) {
    const sorted = sortRecords(values);
    files.set(
      `indexes/categories/${category}.json`,
      stableJson({
        schemaVersion: SCHEMA_VERSION,
        facet: 'category',
        value: category,
        label: displayName(category),
        count: sorted.length,
        mediaTypes: {
          image: sorted.filter((record) => record.mediaType === 'image').length,
          video: sorted.filter((record) => record.mediaType === 'video').length,
        },
        ids: sorted.map((record) => record.id),
      }),
    );
  }

  for (const [model, values] of modelGroups) {
    const sorted = sortRecords(values);
    files.set(
      `indexes/models/${model}.json`,
      stableJson({
        schemaVersion: SCHEMA_VERSION,
        facet: 'recommendedModel',
        value: model,
        label: displayName(model),
        count: sorted.length,
        mediaTypes: {
          image: sorted.filter((record) => record.mediaType === 'image').length,
          video: sorted.filter((record) => record.mediaType === 'video').length,
        },
        ids: sorted.map((record) => record.id),
      }),
    );
  }

  return files;
}

export function buildGeneratedFiles(envelope) {
  const files = new Map([
    ['data/prompts.json', stableJson(envelope)],
    ['data/prompts.jsonl', toJsonl(envelope.items)],
    ['data/prompts.csv', toCsv(envelope.items)],
    ['stats.json', stableJson(buildStats(envelope))],
  ]);

  for (const [path, contents] of buildCatalogFiles(envelope.items)) {
    files.set(path, contents);
  }
  for (const [path, contents] of buildIndexFiles(envelope.items)) {
    files.set(path, contents);
  }
  return files;
}

export function buildReadmeStats(stats) {
  const categoryRows = Object.entries(stats.categories).map(
    ([category, counts]) => {
      const imageLink =
        counts.image > 0
          ? `[${counts.image}](catalog/image/${category}.md)`
          : '0';
      const videoLink =
        counts.video > 0
          ? `[${counts.video}](catalog/video/${category}.md)`
          : '0';
      return `| ${displayName(category)} | ${imageLink} | ${videoLink} | ${counts.total} |`;
    },
  );

  return [
    `**${stats.total} prompts** from **${stats.sourcePosts} source posts** and **${stats.authors} authors**, with **${stats.mediaAssets} source-media links**.`,
    '',
    `Last curated record update: \`${stats.generatedAt}\``,
    '',
    '| Category | Image | Video | Total |',
    '| --- | ---: | ---: | ---: |',
    ...categoryRows,
  ].join('\n');
}

export function replaceReadmeStats(readme, stats) {
  const start = '<!-- DATASET-STATS:START -->';
  const end = '<!-- DATASET-STATS:END -->';
  const startIndex = readme.indexOf(start);
  const endIndex = readme.indexOf(end);
  assert(startIndex !== -1 && endIndex !== -1, 'README stats markers are missing');
  assert(endIndex > startIndex, 'README stats markers are out of order');

  return [
    readme.slice(0, startIndex + start.length),
    '\n',
    buildReadmeStats(stats),
    '\n',
    readme.slice(endIndex),
  ].join('');
}

function changeEntry(record) {
  return {
    id: record.id,
    imglumeId: record.imglumeId,
    title: record.title,
    revision: record.revision,
  };
}

export function buildChanges(previousRecords, currentRecords, generatedAt) {
  const previous = new Map(
    previousRecords.map((record) => [record.id, record]),
  );
  const current = new Map(currentRecords.map((record) => [record.id, record]));
  const added = [];
  const updated = [];
  const removed = [];

  for (const record of currentRecords) {
    const priorRecord = previous.get(record.id);
    if (!priorRecord) {
      added.push(changeEntry(record));
    } else if (
      recordFingerprint(priorRecord) !== recordFingerprint(record)
    ) {
      updated.push({
        ...changeEntry(record),
        previousRevision: priorRecord.revision,
      });
    }
  }

  for (const record of previousRecords) {
    if (!current.has(record.id)) {
      removed.push(changeEntry(record));
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    summary: {
      added: added.length,
      updated: updated.length,
      removed: removed.length,
    },
    added,
    updated,
    removed,
  };
}

export function hasChanges(changeSet) {
  return (
    changeSet.summary.added > 0 ||
    changeSet.summary.updated > 0 ||
    changeSet.summary.removed > 0
  );
}
