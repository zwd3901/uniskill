import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { initCommand } from '../src/commands/init';

const TEST_DIR = path.join(os.tmpdir(), 'uniskill-test-cli-' + Date.now());

describe('CLI init', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('should create uniskill.yaml with init command', async () => {
    // Capture console output
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => { logs.push(msg); };

    try {
      await initCommand(TEST_DIR);
      expect(logs[0]).toContain('已创建配置文件');

      const configPath = path.join(TEST_DIR, 'uniskill.yaml');
      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toContain('source: ./skills');
    } finally {
      console.log = origLog;
    }
  });

  it('should not overwrite existing config', async () => {
    const configPath = path.join(TEST_DIR, 'uniskill.yaml');
    await fs.writeFile(configPath, '# custom config\n');

    const logs: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => { logs.push(msg); };

    try {
      await initCommand(TEST_DIR);
      expect(logs[0]).toContain('已存在');

      const content = await fs.readFile(configPath, 'utf-8');
      expect(content).toBe('# custom config\n');
    } finally {
      console.log = origLog;
    }
  });
});
