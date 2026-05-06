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

const TEST_DIR = path.join(os.tmpdir(), 'uniskill-test-watch-cmd-' + Date.now());

describe('watch command', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('should start watching and perform initial link', async () => {
    const skillsDir = path.join(TEST_DIR, 'skills');
    await fs.mkdir(path.join(skillsDir, 'test-skill'), { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'test-skill', 'SKILL.md'), '# test');

    const config = `source: ./skills\ntargets:\n  - name: test\n    path: ${path.join(TEST_DIR, 'agent').replace(/\\/g, '/')}\n    method: copy\n`;
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'), config);

    const { watchCommand } = await import('../src/commands/watch');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const watcher = await watchCommand(TEST_DIR);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('开始监听'));
    spy.mockRestore();
    await watcher.close();
  });

  it('should auto-sync when change event fires', async () => {
    const skillsDir = path.join(TEST_DIR, 'skills');
    await fs.mkdir(path.join(skillsDir, 'test-skill'), { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'test-skill', 'SKILL.md'), '# test');

    const agentDir = path.join(TEST_DIR, 'agent', 'skills');
    const config = `source: ./skills\ntargets:\n  - name: test\n    path: ${agentDir.replace(/\\/g, '/')}\n    method: copy\n`;
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'), config);

    const { watchCommand } = await import('../src/commands/watch');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const watcher = await watchCommand(TEST_DIR);
    spy.mockClear();

    await fs.mkdir(path.join(skillsDir, 'new-skill'), { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'new-skill', 'SKILL.md'), '# new');

    const chokidar = await import('chokidar');
    const onHandler = (chokidar.watch as any).mock.results.at(-1).value.on;
    const addHandler = onHandler.mock.calls.find((c: any[]) => c[0] === 'add')[1];
    addHandler('new-skill/SKILL.md');

    await new Promise(r => setTimeout(r, 600));

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('同步完成'));
    spy.mockRestore();
    await watcher.close();
  });
});
