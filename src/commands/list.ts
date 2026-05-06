import fs from 'fs/promises';
import path from 'path';
import { loadConfig, expandHome } from '../core/config';

export async function listCommand(cwd: string): Promise<void> {
  const configPath = path.join(cwd, 'uniskill.yaml');
  const config = await loadConfig(configPath);

  const sourceDir = path.resolve(cwd, config.source);

  // Read all skill subdirectories from source
  let skillDirs: string[];
  try {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    skillDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    console.log(`📂 源目录不存在: ${sourceDir}`);
    return;
  }

  if (skillDirs.length === 0) {
    console.log(`📂 源目录中没有技能: ${sourceDir}`);
    return;
  }

  // Precompute which targets are linked to the source
  const linkedTargetNames: string[] = [];

  for (const target of config.targets) {
    const targetPath = path.resolve(expandHome(target.path));
    let isLinked = false;

    try {
      const linkTarget = await fs.readlink(targetPath);
      isLinked = path.resolve(linkTarget) === path.resolve(sourceDir);
    } catch {
      // Not a symlink/junction
    }

    if (isLinked) linkedTargetNames.push(target.name);
  }

  if (linkedTargetNames.length === 0) {
    console.log(`📂 源目录: ${sourceDir}`);
    console.log(`⚠️ 所有技能均未链接到任何 target`);
    return;
  }

  const targets = linkedTargetNames;

  // Column widths
  const skillCol = Math.max(...skillDirs.map((s) => s.length + 1), 6);
  const targetCol = 10; // fixed width per target column
  const iconCol = 6;    // width for ✅ / ❌ padding

  // Header row: Skill | target1 | target2 | ...
  const headerCells = ['Skill'.padEnd(skillCol), ...targets.map((t) => t.padEnd(targetCol))];
  const header = `│ ${headerCells.join(' │ ')} │`;

  // Separator
  const colWidths = [skillCol + 2, ...targets.map(() => targetCol + 2)];
  const sep = colWidths.map((w) => '─'.repeat(w)).join('┬');

  const topSep = `┌${sep}┐`;
  const midSep = `├${sep}┤`;
  const botSep = `└${sep}┘`;

  console.log(`📂 源目录: ${sourceDir}`);
  console.log(`🎯 ${targets.length} 个 target`);
  console.log('');

  // Table header
  console.log(topSep);
  console.log(header);
  console.log(midSep);

  // Table rows — all skills linked to all targets equally
  for (const skillName of skillDirs) {
    const cells = [(skillName + '/').padEnd(skillCol), ...targets.map(() => '✅'.padEnd(targetCol))];
    console.log(`│ ${cells.join(' │ ')} │`);
  }

  console.log(botSep);
  console.log(`  共 ${skillDirs.length} 个技能`);
}
