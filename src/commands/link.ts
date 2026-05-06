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
      console.log(`[DRY-RUN] ${target.name}: 🔗 ${sourceDir} → ${targetPath}`);
      continue;
    }

    const result: LinkResult = await createLink(sourceDir, targetPath);

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
