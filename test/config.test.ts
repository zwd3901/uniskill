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
      expect(yaml).toContain('method: symlink');
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct config', () => {
      const config = {
        source: './skills',
        targets: [
          { name: 'codebuddy', path: '~/.codebuddy/skills', method: 'symlink' as const },
        ],
      };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should throw if targets is empty', () => {
      const config = { source: './skills', targets: [] };
      expect(() => validateConfig(config)).toThrow(/至少一个 target/i);
    });

    it('should throw if method is invalid', () => {
      const config = {
        source: './skills',
        targets: [{ name: 'test', path: '/tmp', method: 'invalid' }],
      };
      expect(() => validateConfig(config)).toThrow(/method/i);
    });

    it('should throw if source is empty', () => {
      const config = { source: '', targets: [{ name: 'test', path: '/tmp', method: 'symlink' as const }] };
      expect(() => validateConfig(config)).toThrow(/source/i);
    });
  });

  describe('loadConfig', () => {
    it('should load a valid YAML config file', async () => {
      const configPath = path.join(TEST_DIR, 'uniskill.yaml');
      await fs.writeFile(configPath, `source: ./skills\ntargets:\n  - name: test\n    path: /tmp/test\n    method: symlink\n`);
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
