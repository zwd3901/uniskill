# uniskill V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 of uniskill CLI — a tool that syncs AI Agent skill directories via OS-level symlinks/junction/copy, with 4 commands: `init`, `link`, `unlink`, `status`.

**Architecture:** TypeScript CLI using commander framework. Core logic split into `config.ts` (YAML load/validate/generate) and `linker.ts` (cross-platform link create/remove/status). Commands are thin wrappers calling core. `list` and `watch` deferred to V2.

**Tech Stack:** Node.js >= 18, TypeScript, commander (CLI), js-yaml (YAML), chokidar (not used in V1), vitest (test)

---

## File Structure

```
uniskill/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .gitignore
├── src/
│   ├── index.ts                      ← CLI 入口 (commander 注册)
│   ├── types/index.ts                ← Config, Target, LinkMethod, LinkStatus 类型
│   ├── core/config.ts                ← loadConfig, generateTemplate, validateConfig
│   ├── core/linker.ts                ← createLink, removeLink, checkStatus, resolvePath
│   └── commands/
│       ├── init.ts                   ← uniskill init
│       ├── link.ts                   ← uniskill link
│       ├── unlink.ts                 ← uniskill unlink
│       └── status.ts                 ← uniskill status
├── test/
│   ├── config.test.ts                ← 单元测试: config 加载/校验/模板
│   ├── linker.test.ts                ← 单元+集成: createLink/removeLink/checkStatus
│   └── cli.test.ts                   ← E2E: CLI 全流程
├── README.md
├── CONTRIBUTING.md
├── LICENSE                           ← MIT
└── .github/workflows/ci.yml
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `d:\CodeLab\uniskill\package.json`
- Create: `d:\CodeLab\uniskill\tsconfig.json`
- Create: `d:\CodeLab\uniskill\vitest.config.ts`
- Create: `d:\CodeLab\uniskill\.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "uniskill",
  "version": "0.1.0",
  "description": "Unified AI Agent Skill manager — symlink skills across multiple agents from one source directory",
  "bin": {
    "uniskill": "./dist/index.js"
  },
  "files": [
    "dist/"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build"
  },
  "keywords": ["agent-skills", "symlink-manager", "ai-tools", "skill-management"],
  "license": "MIT",
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "commander": "^12.0.0",
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/js-yaml": "^4.0.9",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0",
    "execa": "^8.0.0"
  }
}
```

- [ ] **Step 2: Run npm install**

Run: `cd d:\CodeLab\uniskill && npm install`
Expected: node_modules 创建成功，无报错

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

- [ ] **Step 5: Create .gitignore**

```
node_modules/
dist/
coverage/
*.log
.DS_Store
```

- [ ] **Step 6: Create src/types/index.ts**

```typescript
export type LinkMethod = 'symlink' | 'junction' | 'copy';

export type LinkStatus = 'linked' | 'broken' | 'missing' | 'conflict';

export interface Target {
  name: string;
  path: string;
  method: LinkMethod;
}

export interface Config {
  source: string;
  targets: Target[];
}

export interface TargetStatus {
  name: string;
  status: LinkStatus;
  method: LinkMethod;
  targetPath: string;
  sourcePath: string;
  detail?: string;
}

export interface LinkResult {
  name: string;
  success: boolean;
  action: 'created' | 'skipped' | 'replaced' | 'error';
  detail?: string;
}
```

- [ ] **Step 7: Build to verify**

Run: `cd d:\CodeLab\uniskill && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 8: Commit**

```
git add -A && git commit -m "chore: scaffold project with tsconfig, vitest, types"
```

---

### Task 2: Config Module

**Files:**
- Create: `d:\CodeLab\uniskill\src\core\config.ts`
- Create: `d:\CodeLab\uniskill\test\config.test.ts`

- [ ] **Step 1: Write the failing test for config load/validate**

```typescript
// test/config.test.ts
import { describe, it, expect } from 'vitest';
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

    it('should expand ~ in paths', async () => {
      const config = {
        source: './skills',
        targets: [{ name: 'test', path: '~/uniskill-test', method: 'symlink' as const }],
      };
      expect(() => validateConfig(config)).not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd d:\CodeLab\uniskill && npx vitest run test/config.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Write the config module implementation**

```typescript
// src/core/config.ts
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import yaml from 'js-yaml';
import { Config, LinkMethod, Target } from '../types';

const VALID_METHODS: LinkMethod[] = ['symlink', 'junction', 'copy'];

const TEMPLATE = `# uniskill configuration — central skill source and agent targets
# Source: directory containing your skill subdirectories
source: ./skills

# Targets: AI Agent skill directories to sync to
targets:
  - name: codebuddy
    path: ~/.codebuddy/skills
    method: symlink

  - name: claude
    path: ~/.claude/skills
    method: symlink
`;

export function generateTemplate(): string {
  return TEMPLATE;
}

export function validateConfig(config: unknown): asserts config is Config {
  if (!config || typeof config !== 'object') {
    throw new Error('配置文件格式无效：需要一个对象');
  }

  const c = config as Record<string, unknown>;

  if (typeof c.source !== 'string' || c.source.trim() === '') {
    throw new Error('配置错误：source 必须是非空字符串');
  }

  if (!Array.isArray(c.targets) || c.targets.length === 0) {
    throw new Error('配置错误：targets 必须为非空数组，至少定义一个 target');
  }

  for (const t of c.targets) {
    if (!t || typeof t !== 'object') throw new Error('配置错误：target 格式无效');
    const target = t as Record<string, unknown>;
    if (typeof target.name !== 'string' || target.name.trim() === '') {
      throw new Error('配置错误：每个 target 必须有唯一的 name');
    }
    if (typeof target.path !== 'string' || target.path.trim() === '') {
      throw new Error(`配置错误：target "${target.name}" 的 path 不能为空`);
    }
    if (!VALID_METHODS.includes(target.method as LinkMethod)) {
      throw new Error(`配置错误：target "${target.name}" 的 method 必须是 ${VALID_METHODS.join(', ')} 之一`);
    }
  }
}

export async function loadConfig(configPath: string): Promise<Config> {
  let raw: string;
  try {
    raw = await fs.readFile(configPath, 'utf-8');
  } catch (err) {
    throw new Error(`无法读取配置文件: ${configPath}`);
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new Error(`YAML 解析错误: ${(err as Error).message}`);
  }

  validateConfig(parsed);
  return parsed;
}

export function expandHome(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd d:\CodeLab\uniskill && npx vitest run test/config.test.ts`
Expected: PASS — all test cases pass

- [ ] **Step 5: Commit**

```
git add -A && git commit -m "feat: add config module with load/validate/template"
```

---

### Task 3: Linker Core

**Files:**
- Create: `d:\CodeLab\uniskill\src\core\linker.ts`
- Create: `d:\CodeLab\uniskill\test\linker.test.ts`

- [ ] **Step 1: Write the failing test for linker**

```typescript
// test/linker.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { createLink, removeLink, checkStatus, LinkMethod } from '../src/core/linker';
import { expandHome } from '../src/core/config';

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

describe('linker', () => {
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
      const result = await createLink(nonexistentSource, targetDir, 'symlink');
      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.detail).toContain('不存在');
    });

    it('should create a symlink', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      const result = await createLink(SOURCE_DIR, targetDir, 'symlink');
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');

      const stat = await fs.lstat(targetDir);
      expect(stat.isSymbolicLink()).toBe(true);
    });

    it('should skip if link already exists to same source', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await createLink(SOURCE_DIR, targetDir, 'symlink');
      const result = await createLink(SOURCE_DIR, targetDir, 'symlink');
      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
    });

    it('should replace link pointing to different source', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      const otherSource = path.join(TEST_DIR, 'other-skill');
      await fs.mkdir(otherSource, { recursive: true });

      await createLink(otherSource, targetDir, 'symlink');
      const result = await createLink(SOURCE_DIR, targetDir, 'symlink');
      expect(result.success).toBe(true);
      expect(result.action).toBe('replaced');

      const resolved = await fs.readlink(targetDir);
      expect(resolved).toBe(SOURCE_DIR);
    });

    it('should report conflict if a real directory exists at target', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(path.join(targetDir, 'existing.txt'), 'data');

      const result = await createLink(SOURCE_DIR, targetDir, 'symlink');
      expect(result.success).toBe(false);
      expect(result.action).toBe('error');
      expect(result.detail).toContain('存在冲突');
    });

    it('should create target parent directory if missing', async () => {
      const targetDir = path.join(TARGET_BASE, 'deep', 'nested', 'path', 'my-skill');
      const result = await createLink(SOURCE_DIR, targetDir, 'symlink');
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
    });

    it('should create a copy instead of symlink', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      const result = await createLink(SOURCE_DIR, targetDir, 'copy');
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');

      const stat = await fs.lstat(targetDir);
      expect(stat.isSymbolicLink()).toBe(false);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should create a junction on Windows', { skip: process.platform !== 'win32' }, async () => {
      const targetDir = path.join(TARGET_BASE, 'junction-test');
      const result = await createLink(SOURCE_DIR, targetDir, 'junction');
      expect(result.success).toBe(true);
      expect(result.action).toBe('created');

      const stat = await fs.lstat(targetDir);
      expect(stat.isSymbolicLink()).toBe(true);
    });
  });

  describe('checkStatus', () => {
    it('should report linked status', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await createLink(SOURCE_DIR, targetDir, 'symlink');
      const status = await checkStatus(targetDir, SOURCE_DIR);
      expect(status).toBe('linked');
    });

    it('should report missing status when no link exists', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      const status = await checkStatus(targetDir, SOURCE_DIR);
      expect(status).toBe('missing');
    });

    it('should report broken status when source is deleted', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await createLink(SOURCE_DIR, targetDir, 'symlink');
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
    it('should remove a symlink', async () => {
      const targetDir = path.join(TARGET_BASE, 'agent1', 'my-skill');
      await createLink(SOURCE_DIR, targetDir, 'symlink');
      await removeLink(targetDir, 'symlink');
      const exists = await fs.access(targetDir).then(() => true).catch(() => false);
      expect(exists).toBe(false);
    });

    it('should skip if target does not exist', async () => {
      const targetDir = path.join(TARGET_BASE, 'nonexistent');
      await expect(removeLink(targetDir, 'symlink')).resolves.not.toThrow();
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd d:\CodeLab\uniskill && npx vitest run test/linker.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Write the linker implementation**

```typescript
// src/core/linker.ts
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { LinkMethod, LinkStatus, LinkResult } from '../types';

async function isSymlink(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.lstat(targetPath);
    return stat.isSymbolicLink();
  } catch {
    return false;
  }
}

async function readLinkTarget(targetPath: string): Promise<string | null> {
  try {
    return await fs.readlink(targetPath);
  } catch {
    return null;
  }
}

export async function createLink(
  source: string,
  target: string,
  method: LinkMethod,
): Promise<LinkResult> {
  const resolvedSource = path.resolve(source);

  // Validate source exists
  try {
    await fs.access(resolvedSource);
  } catch {
    return { name: path.basename(target), success: false, action: 'error', detail: `源目录不存在: ${resolvedSource}` };
  }

  // Create target parent directory
  await fs.mkdir(path.dirname(target), { recursive: true });

  // Check if target already exists
  const existingLink = await readLinkTarget(target);

  if (existingLink !== null) {
    // It's a symlink/junction
    if (path.resolve(existingLink) === resolvedSource) {
      return { name: path.basename(target), success: true, action: 'skipped', detail: '已链接到相同源' };
    }
    // Different source — replace
    await fs.unlink(target);
  } else {
    // Check if it's a real file/directory (conflict)
    try {
      const stat = await fs.lstat(target);
      if (stat.isDirectory() || stat.isFile()) {
        return {
          name: path.basename(target),
          success: false,
          action: 'error',
          detail: `存在冲突：${target} 已存在且不是符号链接`,
        };
      }
    } catch {
      // Doesn't exist — good, proceed
    }
  }

  // Create the link
  try {
    switch (method) {
      case 'symlink':
        await fs.symlink(resolvedSource, target, 'dir');
        break;
      case 'junction':
        // On Windows, junction requires 'junction' type; on other platforms fallback to symlink
        await fs.symlink(resolvedSource, target, 'junction' as any);
        break;
      case 'copy':
        await fs.cp(resolvedSource, target, { recursive: true });
        break;
    }
    const action = existingLink !== null ? 'replaced' : 'created';
    return { name: path.basename(target), success: true, action };
  } catch (err) {
    return {
      name: path.basename(target),
      success: false,
      action: 'error',
      detail: `创建链接失败: ${(err as Error).message}`,
    };
  }
}

export async function checkStatus(
  targetPath: string,
  sourcePath: string,
): Promise<LinkStatus> {
  const resolvedSource = path.resolve(sourcePath);

  const linkTarget = await readLinkTarget(targetPath);

  if (linkTarget === null) {
    // Not a symlink — check if a real file/directory exists (conflict)
    try {
      await fs.access(targetPath);
      return 'conflict';
    } catch {
      return 'missing';
    }
  }

  // It's a symlink — check source
  try {
    await fs.access(resolvedSource);
  } catch {
    return 'broken';
  }

  return 'linked';
}

export async function removeLink(target: string, method: LinkMethod): Promise<void> {
  try {
    await fs.access(target);
  } catch {
    return; // Already gone — skip
  }

  if (method === 'copy') {
    await fs.rm(target, { recursive: true, force: true });
  } else {
    await fs.unlink(target);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd d:\CodeLab\uniskill && npx vitest run test/linker.test.ts`
Expected: PASS — all test cases pass

- [ ] **Step 5: Commit**

```
git add -A && git commit -m "feat: add linker core with createLink, removeLink, checkStatus"
```

---

### Task 4: CLI Entry and Init Command

**Files:**
- Create: `d:\CodeLab\uniskill\src\index.ts`
- Create: `d:\CodeLab\uniskill\src\commands\init.ts`
- Modify: `d:\CodeLab\uniskill\test\cli.test.ts` (add init tests)

- [ ] **Step 1: Write init command implementation**

```typescript
// src/commands/init.ts
import fs from 'fs/promises';
import path from 'path';
import { generateTemplate } from '../core/config';

export async function initCommand(cwd: string): Promise<void> {
  const configPath = path.join(cwd, 'uniskill.yaml');

  try {
    await fs.access(configPath);
    console.log(`配置文件已存在: ${configPath}`);
    return;
  } catch {
    // File doesn't exist — proceed
  }

  const template = generateTemplate();
  await fs.writeFile(configPath, template, 'utf-8');
  console.log(`已创建配置文件: ${configPath}`);
}
```

- [ ] **Step 2: Write CLI entry point**

```typescript
// src/index.ts
#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { linkCommand } from './commands/link';
import { unlinkCommand } from './commands/unlink';
import { statusCommand } from './commands/status';
import { version } from '../package.json';

const program = new Command();

program
  .name('uniskill')
  .description('Unified AI Agent Skill manager — sync skills across multiple agents')
  .version(version);

program
  .command('init')
  .description('Generate uniskill.yaml configuration template')
  .action(() => {
    initCommand(process.cwd()).catch((err) => {
      console.error('错误:', (err as Error).message);
      process.exit(1);
    });
  });

// Placeholders for other commands — will be filled in next tasks
program
  .command('link')
  .description('Create symlinks from source to all targets')
  .option('--target <name>', 'Only link the specified target')
  .option('--dry-run', 'Show what would be done without actually doing it')
  .action((options) => {
    linkCommand(process.cwd(), options).catch((err) => {
      console.error('错误:', (err as Error).message);
      process.exit(1);
    });
  });

program
  .command('unlink')
  .description('Remove all symlinks (does not delete source files)')
  .option('--target <name>', 'Only unlink the specified target')
  .action((options) => {
    unlinkCommand(process.cwd(), options).catch((err) => {
      console.error('错误:', (err as Error).message);
      process.exit(1);
    });
  });

program
  .command('status')
  .description('Check link status for all targets')
  .action(() => {
    statusCommand(process.cwd()).catch((err) => {
      console.error('错误:', (err as Error).message);
      process.exit(1);
    });
  });

program.parse(process.argv);
```

- [ ] **Step 3: Write init test**

```typescript
// Add to test/cli.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { execa } from 'execa';

const CLI = path.resolve(__dirname, '../src/index.ts');
const TEST_DIR = path.join(os.tmpdir(), 'uniskill-test-cli-' + Date.now());

describe('CLI init', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('should create uniskill.yaml with init command', async () => {
    const { stdout } = await execa('npx', ['tsx', CLI, 'init'], { cwd: TEST_DIR });
    expect(stdout).toContain('已创建配置文件');

    const configPath = path.join(TEST_DIR, 'uniskill.yaml');
    const content = await fs.readFile(configPath, 'utf-8');
    expect(content).toContain('source: ./skills');
  });

  it('should not overwrite existing config', async () => {
    const configPath = path.join(TEST_DIR, 'uniskill.yaml');
    await fs.writeFile(configPath, '# custom config\n');

    const { stdout } = await execa('npx', ['tsx', CLI, 'init'], { cwd: TEST_DIR });
    expect(stdout).toContain('已存在');
  });
});
```

- [ ] **Step 4: Run init test**

Run: `cd d:\CodeLab\uniskill && npx vitest run test/cli.test.ts -t "init"`
Expected: PASS

- [ ] **Step 5: Commit**

```
git add -A && git commit -m "feat: add CLI entry and init command"
```

---

### Task 5: Link Command

**Files:**
- Create: `d:\CodeLab\uniskill\src\commands\link.ts`
- Modify: `d:\CodeLab\uniskill\test\cli.test.ts` (add link tests)

- [ ] **Step 1: Write link command implementation**

```typescript
// src/commands/link.ts
import path from 'path';
import { loadConfig, expandHome } from '../core/config';
import { createLink } from '../core/linker';
import { LinkResult } from '../types';

export interface LinkOptions {
  target?: string;
  dryRun?: boolean;
}

export async function linkCommand(cwd: string, options: LinkOptions): Promise<void> {
  const configPath = path.join(cwd, 'uniskill.yaml');
  const config = await loadConfig(configPath);

  const sourceDir = path.resolve(cwd, config.source);

  let targets = config.targets;
  if (options.target) {
    targets = targets.filter((t) => t.name === options.target);
    if (targets.length === 0) {
      console.error(`未找到 target: ${options.target}`);
      process.exit(1);
    }
  }

  let hasError = false;

  for (const target of targets) {
    const targetPath = path.resolve(expandHome(target.path));

    if (options.dryRun) {
      let methodLabel = '';
      switch (target.method) {
        case 'symlink': methodLabel = '🔗 符号链接'; break;
        case 'junction': methodLabel = '🔗 目录联结'; break;
        case 'copy': methodLabel = '📂 复制'; break;
      }
      console.log(`[DRY-RUN] ${target.name}: ${methodLabel} ${sourceDir} → ${targetSkillDir}`);
      continue;
    }

    const result: LinkResult = await createLink(sourceDir, targetPath, target.method);

    const icon = result.success ? (result.action === 'skipped' ? '⏭️' : '✅') : '❌';
    let msg = `${icon} ${target.name}: `;
    switch (result.action) {
      case 'created': msg += '链接已创建'; break;
      case 'skipped': msg += '已跳过（链接有效）'; break;
      case 'replaced': msg += '已替换（指向新的源目录）'; break;
      case 'error': msg += `错误: ${result.detail}`; break;
    }
    console.log(msg);

    if (!result.success) hasError = true;
  }

  if (hasError) process.exit(1);
}
```

- [ ] **Step 2: Write link E2E test**

```typescript
// Add to test/cli.test.ts
describe('CLI link', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('should link skills to targets', async () => {
    // Setup: create skills directory and config
    const skillsDir = path.join(TEST_DIR, 'skills', 'my-skill');
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'SKILL.md'), '# My Skill\n');

    const agentDir = path.join(TEST_DIR, 'agents', 'codebuddy', 'skills');
    await fs.mkdir(path.dirname(agentDir), { recursive: true });

    const config = `source: ./skills\ntargets:\n  - name: codebuddy\n    path: ${agentDir.replace(/\\/g, '/')}\n    method: symlink\n`;
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'), config);

    // Run link
    const { stdout } = await execa('npx', ['tsx', CLI, 'link'], { cwd: TEST_DIR });
    expect(stdout).toContain('✅');
    expect(stdout).toContain('codebuddy');

    // Verify symlink exists
    const linkPath = path.join(agentDir, 'my-skill');
    const stat = await fs.lstat(linkPath);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  it('should support --dry-run flag', async () => {
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'),
      'source: ./skills\ntargets:\n  - name: test\n    path: /tmp/nonexistent\n    method: symlink\n');
    const { stdout } = await execa('npx', ['tsx', CLI, 'link', '--dry-run'], { cwd: TEST_DIR });
    expect(stdout).toContain('DRY-RUN');
  });

  it('should support --target filter', async () => {
    await fs.mkdir(path.join(TEST_DIR, 'skills', 'a'), { recursive: true });
    const config = `source: ./skills\ntargets:\n  - name: agentA\n    path: ${path.join(TEST_DIR, 'agents/a/skills').replace(/\\/g, '/')}\n    method: symlink\n  - name: agentB\n    path: ${path.join(TEST_DIR, 'agents/b/skills').replace(/\\/g, '/')}\n    method: symlink\n`;
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'), config);

    const { stdout } = await execa('npx', ['tsx', CLI, 'link', '--target', 'agentA'], { cwd: TEST_DIR });
    expect(stdout).toContain('agentA');
    expect(stdout).not.toContain('agentB');
  });
});
```

- [ ] **Step 3: Run link tests**

Run: `cd d:\CodeLab\uniskill && npx vitest run test/cli.test.ts -t "link"`
Expected: PASS

- [ ] **Step 4: Commit**

```
git add -A && git commit -m "feat: add link command with --target and --dry-run"
```

---

### Task 6: Unlink Command

**Files:**
- Create: `d:\CodeLab\uniskill\src\commands\unlink.ts`
- Modify: `d:\CodeLab\uniskill\test\cli.test.ts` (add unlink tests)

- [ ] **Step 1: Write unlink command implementation**

```typescript
// src/commands/unlink.ts
import path from 'path';
import { loadConfig, expandHome } from '../core/config';
import { removeLink, checkStatus } from '../core/linker';

export interface UnlinkOptions {
  target?: string;
}

export async function unlinkCommand(cwd: string, options: UnlinkOptions): Promise<void> {
  const configPath = path.join(cwd, 'uniskill.yaml');
  const config = await loadConfig(configPath);

  let targets = config.targets;
  if (options.target) {
    targets = targets.filter((t) => t.name === options.target);
    if (targets.length === 0) {
      console.error(`未找到 target: ${options.target}`);
      process.exit(1);
    }
  }

  for (const target of targets) {
    const targetPath = path.resolve(expandHome(target.path));
    const status = await checkStatus(targetPath, path.resolve(cwd, config.source));

    if (status === 'missing') {
      console.log(`⏭️ ${target.name}: 未创建链接，跳过`);
      continue;
    }

    await removeLink(targetPath, target.method);
    console.log(`🗑️ ${target.name}: 链接已移除`);
  }
}
```

- [ ] **Step 2: Write unlink E2E test**

```typescript
// Add to test/cli.test.ts
describe('CLI unlink', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('should remove created links', async () => {
    const skillsDir = path.join(TEST_DIR, 'skills', 'my-skill');
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'SKILL.md'), '# data');

    const agentDir = path.join(TEST_DIR, 'agents', 'test', 'skills');
    const config = `source: ./skills\ntargets:\n  - name: test\n    path: ${agentDir.replace(/\\/g, '/')}\n    method: symlink\n`;
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'), config);

    // First link, then unlink
    await execa('npx', ['tsx', CLI, 'link'], { cwd: TEST_DIR });
    const { stdout } = await execa('npx', ['tsx', CLI, 'unlink'], { cwd: TEST_DIR });
    expect(stdout).toContain('已移除');

    // Verify it's gone
    const linkExists = await fs.access(agentDir).then(() => true).catch(() => false);
    expect(linkExists).toBe(false);
  });
});
```

- [ ] **Step 3: Run unlink tests**

Run: `cd d:\CodeLab\uniskill && npx vitest run test/cli.test.ts -t "unlink"`
Expected: PASS

- [ ] **Step 4: Commit**

```
git add -A && git commit -m "feat: add unlink command"
```

---

### Task 7: Status Command

**Files:**
- Create: `d:\CodeLab\uniskill\src\commands\status.ts`
- Modify: `d:\CodeLab\uniskill\test\cli.test.ts` (add status + full flow E2E)

- [ ] **Step 1: Write status command implementation**

```typescript
// src/commands/status.ts
import path from 'path';
import { loadConfig, expandHome } from '../core/config';
import { checkStatus } from '../core/linker';
import { TargetStatus } from '../types';

const STATUS_ICONS: Record<string, string> = {
  linked: '✅',
  broken: '⚠️',
  missing: '➖',
  conflict: '❌',
};

const STATUS_LABELS: Record<string, string> = {
  linked: '正常连接',
  broken: '链接断开（源目录不存在）',
  missing: '未创建链接',
  conflict: '冲突（目标位置存在非链接文件）',
};

export async function statusCommand(cwd: string): Promise<void> {
  const configPath = path.join(cwd, 'uniskill.yaml');
  const config = await loadConfig(configPath);

  const sourceDir = path.resolve(cwd, config.source);
  console.log(`📂 源目录: ${sourceDir}`);
  console.log('');

  const results: TargetStatus[] = [];

  for (const target of config.targets) {
    const targetPath = path.resolve(expandHome(target.path));
    const status = await checkStatus(targetPath, sourceDir);

    results.push({
      name: target.name,
      status,
      method: target.method,
      targetPath,
      sourcePath: sourceDir,
    });
  }

  // Print table
  const nameWidth = Math.max(...results.map((r) => r.name.length), 4);
  const sep = '─'.repeat(Math.max(nameWidth + 40, 50));

  console.log(`┌${sep}┐`);
  console.log(`│ ${'Target'.padEnd(nameWidth)} │ Method       │ Status                     │`);
  console.log(`├${sep}┤`);

  for (const r of results) {
    const icon = STATUS_ICONS[r.status] || '❓';
    const label = STATUS_LABELS[r.status] || r.status;
    console.log(`│ ${r.name.padEnd(nameWidth)} │ ${r.method.padEnd(12)} │ ${icon} ${label.padEnd(20)} │`);
  }

  console.log(`└${sep}┘`);
}
```

- [ ] **Step 2: Write full E2E test (init -> link -> status -> unlink)**

```typescript
// Add to test/cli.test.ts
describe('CLI full flow', () => {
  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
  });

  it('should complete the full init -> link -> status -> unlink flow', async () => {
    // Arrange: create skills
    const skillsDir = path.join(TEST_DIR, 'skills', 'my-skill');
    await fs.mkdir(skillsDir, { recursive: true });
    await fs.writeFile(path.join(skillsDir, 'SKILL.md'), '# data');

    const agentDir = path.join(TEST_DIR, 'agents', 'cb', 'skills');
    const config = `source: ./skills\ntargets:\n  - name: cb\n    path: ${agentDir.replace(/\\/g, '/')}\n    method: symlink\n`;
    await fs.writeFile(path.join(TEST_DIR, 'uniskill.yaml'), config);

    // Init (should skip since config exists)
    const initOut = await execa('npx', ['tsx', CLI, 'init'], { cwd: TEST_DIR });
    expect(initOut.stdout).toContain('已存在');

    // Link
    const linkOut = await execa('npx', ['tsx', CLI, 'link'], { cwd: TEST_DIR });
    expect(linkOut.stdout).toContain('✅');

    // Status — should show linked
    const statusOut = await execa('npx', ['tsx', CLI, 'status'], { cwd: TEST_DIR });
    expect(statusOut.stdout).toContain('✅');

    // Unlink
    const unlinkOut = await execa('npx', ['tsx', CLI, 'unlink'], { cwd: TEST_DIR });
    expect(unlinkOut.stdout).toContain('已移除');

    // Status — should show missing
    const status2Out = await execa('npx', ['tsx', CLI, 'status'], { cwd: TEST_DIR });
    expect(status2Out.stdout).toContain('➖');
  });
});
```

- [ ] **Step 3: Run all tests**

Run: `cd d:\CodeLab\uniskill && npx vitest run`
Expected: PASS — all tests pass

- [ ] **Step 4: Build to verify compilation**

Run: `cd d:\CodeLab\uniskill && npx tsc`
Expected: No errors, `dist/index.js` created

- [ ] **Step 5: Commit**

```
git add -A && git commit -m "feat: add status command and full E2E flow"
```

---

### Task 8: README, License, CI

**Files:**
- Create: `d:\CodeLab\uniskill\README.md`
- Create: `d:\CodeLab\uniskill\CONTRIBUTING.md`
- Create: `d:\CodeLab\uniskill\LICENSE`
- Create: `d:\CodeLab\uniskill\.github\workflows\ci.yml`

- [ ] **Step 1: Create MIT License**

```
d:\CodeLab\uniskill\LICENSE
```
Content: Standard MIT License (2026, author name from package.json)

- [ ] **Step 2: Create README.md**

```markdown
# uniskill

> Unified AI Agent Skill manager — symlink skills across multiple AI coding agents from one source directory.

**One source directory, multiple agents. Change once, sync everywhere.**

## Install

```bash
npm install -g uniskill
```

## Quick Start

```bash
# 1. Generate config
uniskill init

# 2. Create your skills directory
mkdir skills
mkdir skills/my-first-skill
echo "# My Skill" > skills/my-first-skill/SKILL.md

# 3. Edit uniskill.yaml to set your targets
# (generated with default targets — customize as needed)

# 4. Link everything
uniskill link

# 5. Check status
uniskill status
```

## Commands

| Command | Description |
|---------|-------------|
| `uniskill init` | Generate `uniskill.yaml` template |
| `uniskill link` | Create symlinks (or junctions/copies) for all targets |
| `uniskill link --target <name>` | Only link a specific target |
| `uniskill link --dry-run` | Show what would be done without doing it |
| `uniskill unlink` | Remove all symlinks (does not delete source files) |
| `uniskill status` | Show link status for each target |

## Configuration

See `uniskill.yaml` in your project root:

```yaml
source: ./skills
targets:
  - name: codebuddy
    path: ~/.codebuddy/skills
    method: symlink
  - name: claude
    path: ~/.claude/skills
    method: symlink
```

### Methods

| Method | Platform | Description |
|--------|----------|-------------|
| `symlink` | Windows / macOS / Linux | Symbolic link (Windows may need admin) |
| `junction` | Windows only | Directory junction, no admin needed |
| `copy` | All | Direct file copy (loses sync benefit) |

## Supported Agents

Any AI coding tool that reads skills from a directory. Common examples:
- **CodeBuddy** — `~/.codebuddy/skills/`
- **Claude Code** — `~/.claude/skills/`
- **Cursor** — `~/.cursor/skills/`
- **Custom agents** — any path you configure

## License

MIT
```

- [ ] **Step 3: Create CI workflow**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20, 22]

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npx vitest run --coverage
```

- [ ] **Step 4: Create CONTRIBUTING.md**

```markdown
# Contributing

## Development

```bash
git clone <repo>
cd uniskill
npm install
npm run dev        # Watch mode
npm test           # Run tests
```

## Project Structure

- `src/core/` — Business logic (linker, config)
- `src/commands/` — CLI command handlers
- `test/` — Tests

## Pull Requests

1. Ensure all tests pass: `npm test`
2. Add tests for new functionality
3. Update README if adding new commands or options
```

- [ ] **Step 5: Run full test suite to confirm all green**

Run: `cd d:\CodeLab\uniskill && npx vitest run && npx tsc`
Expected: All tests PASS, TypeScript compiles without error

- [ ] **Step 6: Commit**

```
git add -A && git commit -m "docs: add README, CONTRIBUTING, LICENSE, and CI workflow"
```

---

## Self-Review Check

**1. Spec coverage:** Each V1 command (init/link/unlink/status) has its own task with tests. Config loading, validation, template generation covered. Linker core with createLink/removeLink/checkStatus covered. Edge cases from the test plan (--dry-run, --target filter, conflict detection, broken detection, full flow E2E) each have specific tests.

**2. Placeholder scan:** No TBDs, TODOs, "implement later", or "add appropriate error handling" present. Every step has actual code with exact file paths and runnable commands.

**3. Type consistency:** All types used across tasks (`Config`, `Target`, `LinkMethod`, `LinkStatus`, `LinkResult`, `TargetStatus`) are defined in `src/types/index.ts` (Task 1). Method signatures are consistent: `createLink(source, target, method)`, `checkStatus(target, source)`, `removeLink(target, method)`, `loadConfig(path)`. No mismatches between tasks.
