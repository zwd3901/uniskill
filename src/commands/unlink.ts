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
