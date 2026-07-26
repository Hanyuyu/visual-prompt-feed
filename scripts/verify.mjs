import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SCHEMA_VERSION,
  buildGeneratedFiles,
  buildStats,
  replaceReadmeStats,
  validateApiDataset,
  validateRecords,
} from './dataset.mjs';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function listFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await listFiles(path)));
    } else {
      result.push(relative(repositoryRoot, path));
    }
  }
  return result;
}

async function main() {
  const envelope = JSON.parse(
    await readFile(join(repositoryRoot, 'data/prompts.json'), 'utf8'),
  );
  assert(
    envelope.schemaVersion === SCHEMA_VERSION,
    `unsupported schema: ${String(envelope.schemaVersion)}`,
  );
  validateApiDataset(envelope.dataset);
  validateRecords(envelope.items);
  assert(
    envelope.count === envelope.items.length,
    'snapshot count does not match items length',
  );

  const expectedFiles = buildGeneratedFiles(envelope);
  const actualGeneratedFiles = (
    await Promise.all(
      ['data', 'catalog', 'indexes'].map((directory) =>
        listFiles(join(repositoryRoot, directory)),
      ),
    )
  )
    .flat()
    .concat('stats.json')
    .sort();
  const expectedPaths = [...expectedFiles.keys()].sort();
  assert(
    JSON.stringify(actualGeneratedFiles) === JSON.stringify(expectedPaths),
    `generated file set differs\nexpected: ${expectedPaths.join(', ')}\nactual: ${actualGeneratedFiles.join(', ')}`,
  );

  for (const [path, expected] of expectedFiles) {
    const actual = await readFile(join(repositoryRoot, path), 'utf8');
    assert(actual === expected, `${path} is stale or non-deterministic`);
  }

  const readmePath = join(repositoryRoot, 'README.md');
  const readme = await readFile(readmePath, 'utf8');
  assert(
    replaceReadmeStats(readme, buildStats(envelope)) === readme,
    'README dataset statistics are stale',
  );

  const schema = JSON.parse(
    await readFile(
      join(repositoryRoot, 'schema/prompt.schema.json'),
      'utf8',
    ),
  );
  assert(
    schema.$id ===
      'https://github.com/Hanyuyu/imglume-prompts/schema/prompt.schema.json',
    'JSON Schema $id is unexpected',
  );

  const latestChanges = JSON.parse(
    await readFile(join(repositoryRoot, 'changes/latest.json'), 'utf8'),
  );
  assert(
    latestChanges.schemaVersion === SCHEMA_VERSION,
    'latest change set uses an unsupported schema',
  );
  const currentIds = new Set(envelope.items.map((record) => record.id));
  for (const entry of [
    ...latestChanges.added,
    ...latestChanges.updated,
  ]) {
    assert(
      currentIds.has(entry.id),
      `latest change set references a missing current record: ${entry.id}`,
    );
  }

  console.log(
    `Validated ${envelope.count} prompts, ${expectedPaths.length} generated files, and all rights invariants.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
