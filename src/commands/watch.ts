import path from 'path';
import { loadConfig, expandHome } from '../core/config';
import { createLink } from '../core/linker';
import { startWatch, Watcher } from '../core/watcher';

export async function watchCommand(cwd: string): Promise<Watcher> {
  const configPath = path.join(cwd, 'uniskill.yaml');
  const config = await loadConfig(configPath);

  const sourceDir = path.resolve(cwd, config.source);

  console.log('🔄 执行初始链接...');
  for (const target of config.targets) {
    const targetPath = path.resolve(expandHome(target.path));
    const result = await createLink(sourceDir, targetPath, target.method);
    const icon = result.success ? '✅' : '❌';
    console.log(`  ${icon} ${target.name}: ${result.action}`);
  }

  console.log(`👀 开始监听: ${sourceDir}`);
  console.log('   按 Ctrl+C 停止监听');

  const watcher = await startWatch(sourceDir, async () => {
    console.log('🔄 检测到变化，自动同步...');
    for (const target of config.targets) {
      const targetPath = path.resolve(expandHome(target.path));
      await createLink(sourceDir, targetPath, target.method);
    }
    console.log('✅ 同步完成');
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
