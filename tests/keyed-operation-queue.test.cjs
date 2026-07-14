/* global __dirname */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (loadedModule, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  loadedModule._compile(compiled.outputText, filename);
};

const { KeyedOperationQueue } = require('../utils/keyed-operation-queue.ts');

test('serializes operations for one job while allowing another job to proceed', async () => {
  const queue = new KeyedOperationQueue();
  const events = [];
  let releaseFirst;
  const firstGate = new Promise((resolve) => {
    releaseFirst = resolve;
  });

  const first = queue.run('job-1', async () => {
    events.push('job-1:first:start');
    await firstGate;
    events.push('job-1:first:end');
    return 'first';
  });
  const second = queue.run('job-1', async () => {
    events.push('job-1:second');
    return 'second';
  });
  const otherJob = queue.run('job-2', async () => {
    events.push('job-2');
    return 'other';
  });

  await otherJob;
  assert.deepEqual(events, ['job-1:first:start', 'job-2']);
  releaseFirst();
  assert.deepEqual(await Promise.all([first, second]), ['first', 'second']);
  assert.deepEqual(events, [
    'job-1:first:start',
    'job-2',
    'job-1:first:end',
    'job-1:second',
  ]);
});

test('continues the queue after a failed operation', async () => {
  const queue = new KeyedOperationQueue();
  const events = [];

  await assert.rejects(
    queue.run('job-1', async () => {
      events.push('failed');
      throw new Error('expected failure');
    }),
    /expected failure/,
  );
  const result = await queue.run('job-1', async () => {
    events.push('recovered');
    return 42;
  });

  assert.equal(result, 42);
  assert.deepEqual(events, ['failed', 'recovered']);
});
