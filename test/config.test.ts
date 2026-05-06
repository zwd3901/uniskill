import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { loadConfig, generateTemplate, validateConfig } from '../src/core/config';

const TEST_DIR = path.join(os.tmpdir(), 'uniskill-test-config-' + Date.now());

describe('config', () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  describe('generateTemplate', () => {
    it('should generate valid YAML template', () => {
      const yaml = generateTemplate();
      expect(yaml).toContain('source:');
      expect(yaml).toContain('targets:');
      // Template should NOT contain method anymore
      expect(yaml).not.toContain('method:');
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct config without method', () => {
      const config = {
        source: './skills',
        targets: [
          { name: 'codebuddy', path: '~/.codebuddy/skills' },
        ],
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw if targets is empty', () => {
      const config = { source: './skills', targets: [] };
      expect(() => validateConfig(config)).toThrow(/至少一个 target/i);
    });

    it('should throw if source is empty', () => {
      const config = { source: '', targets: [{ name: 'test', path: '/tmp' }] };
      expect(() => validateConfig(config)).toThrow(/source/i);
    });
  });

  describe('loadConfig', () => {
    it('should load a valid YAML config file without method', async () => {
      const configPath = path.join(TEST_DIR, 'uniskill.yaml');
      await fs.writeFile(configPath, `source: ./skills\ntargets:\n  - name: test\n    path: /tmp/test\n`);
      const config = await loadConfig(configPath);
      expect(config.source).toBe('./skills');
      expect(config.targets).toHaveLength(1);
    });

    it('should throw on invalid YAML', async () => {
      const configPath = path.join(TEST_DIR, 'bad.yaml');
      await fs.writeFile(configPath, 'source: [bad\n');
      await expect(loadConfig(configPath)).rejects.toThrow();
    });

    it('should throw if file does not exist', async () => {
      const configPath = path.join(TEST_DIR, 'nonexistent.yaml');
      await expect(loadConfig(configPath)).rejects.toThrow(/无法读取/);
    });
  });
});
