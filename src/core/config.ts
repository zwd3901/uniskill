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
    throw new Error('配置错误：targets 必须为非空数组，至少一个 target');
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
