import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { createLink, removeLink, checkStatus } from '../src/core/linker';

const TEST_DIR = path.join(os.tmpdir(), 'uniskill-test-linker-' + Date.now());
const SOURCE_DIR = path.join(TEST_DIR, 'skills', 'my-skill');
const TARGET_BASE = path.join(TEST_DIR, 'agents');

async function createTestEnv() {
  await fs.mkdir(SOURCE_DIR, { recursive: true });
  await fs.writeFile(path.join(SOURCE_DIR, 'SKILL.md'), '# Test Skill\n');
}

async function cleanupTestEnv() {
  await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
}

async function symlinksSupported(): Promise<boolean> {
  const testLink = path.join(TEST_DIR, '__symlink_test__');
  try {
    await fs.symlink(TEST_DIR, testLink, 'dir');
    await fs.unlink(testLink);
    return true;
  } catch {
    return false;
  }
}

describe('linker', () => {
  let canSymlink: boolean;

  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    canSymlink = await symlinksSupported();
  });

  beforeEach(async () => {
    await cleanupTestEnv();
    await fs.mkdir(TARGET_BASE, { recursive: true });
    await createTestEnv();
  });

  afterEach(async () => {
    await cleanupTestEnv();
  });

  describe('createLink', () => {
    it('should report error if source does not exist', async () => {
      const nonexistentSource = path.join(TEST_DIR, 'nonexistent-source');
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      const result = await createLink(nonexistentSource, targetDir);
      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.detail).toContain('不存在');
    });

    it('should create a link', { skip: !canSymlink }, async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      const result = await createLink(SOURCE_DIR, targetDir);
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
    });

    it('should skip if link already exists to same source', { skip: !canSymlink }, async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await createLink(SOURCE_DIR, targetDir);
      const result = await createLink(SOURCE_DIR, targetDir);
      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
    });

    it('should replace link pointing to different source', { skip: !canSymlink }, async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      const otherSource = path.join(TEST_DIR, 'other-skill');
      await fs.mkdir(otherSource, { recursive: true });

      await createLink(otherSource, targetDir);
      const result = await createLink(SOURCE_DIR, targetDir);
      expect(result.success).toBe(true);
      expect(result.action).toBe('replaced');

      const resolved = await fs.readlink(targetDir);
      expect(resolved).toBe(SOURCE_DIR);
    });

    it('should report conflict if a real directory exists at target', { skip: !canSymlink }, async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(path.join(targetDir, 'existing.txt'), 'data');

      const result = await createLink(SOURCE_DIR, targetDir);
      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.detail).toContain('存在冲突');
    });

    it('should create target parent directory if missing', { skip: !canSymlink }, async () => {
      const targetDir = path.join(TARGET_BASE, 'deep', 'nested', 'path', 'my-skill');
      const result = await createLink(SOURCE_DIR, targetDir);
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
    });
  });

  describe('checkStatus', () => {
    it('should report linked status', { skip: !canSymlink }, async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await createLink(SOURCE_DIR, targetDir);
      const status = await checkStatus(targetDir, SOURCE_DIR);
      expect(status).toBe('linked');
    });

    it('should report missing status when no link exists', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      const status = await checkStatus(targetDir, SOURCE_DIR);
      expect(status).toBe('missing');
    });

    it('should report broken status when source is deleted', { skip: !canSymlink }, async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await createLink(SOURCE_DIR, targetDir);
      await fs.rm(SOURCE_DIR, { recursive: true, force: true });
      const status = await checkStatus(targetDir, SOURCE_DIR);
      expect(status).toBe('broken');
    });

    it('should report conflict when a file exists at target', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await fs.mkdir(path.dirname(targetDir), { recursive: true });
      await fs.writeFile(targetDir, 'this is a file, not a link');
      const status = await checkStatus(targetDir, SOURCE_DIR);
      expect(status).toBe('conflict');
    });
  });

  describe('removeLink', () => {
    it('should remove a link', { skip: !canSymlink }, async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await createLink(SOURCE_DIR, targetDir);
      await removeLink(targetDir);
      const exists = await fs.access(targetDir).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should skip if target does not exist', async () => {
      const targetDir = path.join(TARGET_BASE, 'nonexistent');
      await expect(removeLink(targetDir)).resolves.not.toThrow();
    });
  });
});
