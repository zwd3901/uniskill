import path from 'path';
import { loadConfig, expandHome } from '../core/config';
import { createLink } from '../core/linker';
import { createWatchManager, Watcher } from '../core/watcher';

export async function watchCommand(cwd: string): Promise<Watcher> {
  const configPath = path.join(cwd, 'uniskill.yaml');
  const config = await loadConfig(configPath);

  const sourceDir = path.resolve(cwd, config.source);

  console.log('🔄 执行初始链接...');
  for (const target of config.targets) {
    const targetPath = path.resolve(expandHome(target.path));
    const result = await createLink(sourceDir, targetPath);
    const icon = result.success ? '✅' : '❌';
    console.log(`  ${icon} ${target.name}: ${result.action}`);
  }

  const watcher = await createWatchManager({
    sourceDir,
    targets: config.targets.map((t) => ({
      name: t.name,
      path: path.resolve(expandHome(t.path)),
    })),
  });

  const cleanup = async () => {
    console.log('\n👋 停止监听...');
    await watcher.close();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  return watcher;
}