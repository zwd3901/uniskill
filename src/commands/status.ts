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
      targetPath,
      sourcePath: sourceDir,
    });
  }

  // Print table — no Method column
  const nameWidth = Math.max(...results.map((r) => r.name.length), 4);
  const sep = '─'.repeat(Math.max(nameWidth + 28, 50));

  console.log(`┌${sep}┐`);
  console.log(`│ ${'Target'.padEnd(nameWidth)} │ Status                     │`);
  console.log(`├${sep}┤`);

  for (const r of results) {
    const icon = STATUS_ICONS[r.status] || '❓';
    const label = STATUS_LABELS[r.status] || r.status;
    console.log(`│ ${r.name.padEnd(nameWidth)} │ ${icon} ${label.padEnd(20)} │`);
  }

  console.log(`└${sep}┘`);
}
