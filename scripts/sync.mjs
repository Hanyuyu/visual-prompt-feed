import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_API_URL,
  SCHEMA_VERSION,
  buildChanges,
  buildEnvelope,
  buildGeneratedFiles,
  buildStats,
  hasChanges,
  replaceReadmeStats,
  stableJson,
  validateApiDataset,
  validateRecords,
} from './dataset.mjs';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const apiUrl = process.env.OPEN_PROMPTS_API_URL ?? DEFAULT_API_URL;

async function readJsonIfPresent(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeAtomic(relativePath, contents) {
  const target = join(repositoryRoot, relativePath);
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, contents, 'utf8');
  await rename(temporary, target);
}

async function fetchSnapshot() {
  const records = [];
  const seenCursors = new Set();
  let cursor = null;
  let dataset = null;

  for (let page = 1; page <= 1_000; page += 1) {
    const url = new URL(apiUrl);
    url.searchParams.set('limit', '100');
    if (cursor !== null) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await fetch(url, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(
        `API request failed (${response.status}): ${await response.text()}`,
      );
    }

    const body = await response.json();
    if (body.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(
        `unexpected API schema: ${String(body.schemaVersion)}`,
      );
    }
    validateApiDataset(body.dataset);
    if (dataset === null) {
      dataset = body.dataset;
    } else if (JSON.stringify(dataset) !== JSON.stringify(body.dataset)) {
      throw new Error('dataset metadata changed between API pages');
    }
    if (!Array.isArray(body.items)) {
      throw new Error(`page ${page} did not contain an items array`);
    }

    records.push(...body.items);
    if (body.nextCursor === null) {
      break;
    }
    if (
      typeof body.nextCursor !== 'string' ||
      body.nextCursor.length === 0
    ) {
      throw new Error(`page ${page} returned an invalid nextCursor`);
    }
    if (seenCursors.has(body.nextCursor)) {
      throw new Error(`cursor loop detected at ${body.nextCursor}`);
    }
    seenCursors.add(body.nextCursor);
    cursor = body.nextCursor;

    if (page === 1_000) {
      throw new Error('pagination exceeded the 1,000-page safety limit');
    }
  }

  validateRecords(records);
  return buildEnvelope(dataset, records);
}

async function main() {
  const previousEnvelope = await readJsonIfPresent(
    join(repositoryRoot, 'data/prompts.json'),
  );
  if (previousEnvelope !== null) {
    if (previousEnvelope.schemaVersion !== SCHEMA_VERSION) {
      throw new Error('existing snapshot uses an unsupported schema');
    }
    validateRecords(previousEnvelope.items);
  }

  const envelope = await fetchSnapshot();
  const previousRecords = previousEnvelope?.items ?? [];
  const changeSet = buildChanges(
    previousRecords,
    envelope.items,
    envelope.generatedAt,
  );
  const generatedFiles = buildGeneratedFiles(envelope);

  for (const generatedDirectory of ['data', 'catalog', 'indexes']) {
    await rm(join(repositoryRoot, generatedDirectory), {
      recursive: true,
      force: true,
    });
  }
  for (const [path, contents] of generatedFiles) {
    await writeAtomic(path, contents);
  }

  const readmePath = join(repositoryRoot, 'README.md');
  const readme = await readFile(readmePath, 'utf8');
  await writeAtomic(
    'README.md',
    replaceReadmeStats(readme, buildStats(envelope)),
  );

  if (hasChanges(changeSet)) {
    const changeContents = stableJson(changeSet);
    await writeAtomic('changes/latest.json', changeContents);
    await writeAtomic(
      `changes/${envelope.generatedAt.slice(0, 10)}.json`,
      changeContents,
    );
  }

  console.log(
    [
      `Synced ${envelope.count} prompts from ${apiUrl}.`,
      `Added ${changeSet.summary.added},`,
      `updated ${changeSet.summary.updated},`,
      `removed ${changeSet.summary.removed}.`,
    ].join(' '),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
