import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { listCommand } from '../src/commands/list';

const TEST_DIR = path.join(os.tmpdir(), 'uniskill-test-list-' + Date.now());

describe('list', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('should list skills with target', async () => {
    const skillsDir = path.join(TEST_DIR, 'skills');
    await fs.mkdir(path.join(skillsDir, 'my-skill'), { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'my-skill', 'SKILL.md'), '# skill1');

    const agentDir = path.join(TEST_DIR, 'agents', 'cb', 'skills');
    const config = `source: ./skills\ntargets:\n  - name: cb\n    path: ${agentDir.replace(/\\/g, '/')}\n`;
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'), config);

    // Use createLink to create a real junction/symlink
    const { createLink } = await import('../src/core/linker');
    const result = await createLink(skillsDir, agentDir);
    if (!result.success) {
      // Fallback: manually create directory if link creation fails
      await fs.mkdir(agentDir, { recursive: true });
    }

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listCommand(TEST_DIR);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('my-skill'));
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('cb'));
    spy.mockRestore();
  });

  it('should handle empty skills directory', async () => {
    await fs.mkdir(path.join(TEST_DIR, 'skills'), { recursive: true });
    const config = `source: ./skills\ntargets:\n  - name: test\n    path: /tmp/nonexistent\n`;
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'), config);

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listCommand(TEST_DIR);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('没有技能'));
    spy.mockRestore();
  });

  it('should handle source directory not found', async () => {
    const config = `source: ./nonexistent\ntargets:\n  - name: test\n    path: /tmp/test\n`;
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'), config);

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listCommand(TEST_DIR);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('不存在'));
    spy.mockRestore();
  });

  it('should show unlinked for skills not linked to any target', async () => {
    await fs.mkdir(path.join(TEST_DIR, 'skills', 'orphan-skill'), { recursive: true });
    await fs.writeFile(path.join(TEST_DIR, 'skills', 'orphan-skill', 'SKILL.md'), '# alone');
    const config = `source: ./skills\ntargets:\n  - name: cb\n    path: ${path.join(TEST_DIR, 'agents/cb/skills').replace(/\\/g, '/')}\n`;
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'), config);

    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await listCommand(TEST_DIR);

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('未链接'));
    spy.mockRestore();
  });
});
