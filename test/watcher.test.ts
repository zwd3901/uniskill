import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';

vi.mock('chokidar', () => {
  const mockWatch = vi.fn(() => ({
    on: vi.fn(),
    close: vi.fn(),
  }));
  return { default: { watch: mockWatch }, watch: mockWatch };
});

const TEST_DIR = path.join(os.tmpdir(), 'uniskill-test-watcher-' + Date.now());

describe('watcher', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('should watch a directory and call back on changes', async () => {
    const chokidar = await import('chokidar');
    const { startWatch } = await import('../src/core/watcher');

    const callback = vi.fn();
    const watcher = await startWatch(TEST_DIR, callback);

    expect(chokidar.watch).toHaveBeenCalledWith(TEST_DIR, expect.any(Object));
    expect(watcher).toBeDefined();

    await watcher.close();
  });

  it('should debounce rapid changes', async () => {
    vi.useFakeTimers();
    const { startWatch } = await import('../src/core/watcher');

    const callback = vi.fn();
    const watcher = await startWatch(TEST_DIR, callback);

    const chokidar = await import('chokidar');
    const lastResult = (chokidar.watch as any).mock.results.at(-1);
    const onHandler = lastResult.value.on;
    const changeHandler = onHandler.mock.calls.find((c: any[]) => c[0] === 'change')[1];

    changeHandler('file1.md');
    changeHandler('file2.md');
    changeHandler('file3.md');

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
    await watcher.close();
  });

  it('should trigger callback on add and unlink events', async () => {
    const { startWatch } = await import('../src/core/watcher');
    const callback = vi.fn();
    const watcher = await startWatch(TEST_DIR, callback);

    const chokidar = await import('chokidar');
    const lastResult = (chokidar.watch as any).mock.results.at(-1);
    const onHandler = lastResult.value.on;

    const addHandler = onHandler.mock.calls.find((c: any[]) => c[0] === 'add')[1];
    const unlinkHandler = onHandler.mock.calls.find((c: any[]) => c[0] === 'unlink')[1];

    addHandler('new-skill/SKILL.md');
    unlinkHandler('old-skill/SKILL.md');

    await new Promise(r => setTimeout(r, 600));
    expect(callback).toHaveBeenCalledTimes(1);

    await watcher.close();
  });
});
