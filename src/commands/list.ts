import fs from 'fs/promises';
import path from 'path';
import { loadConfig, expandHome } from '../core/config';

export async function listCommand(cwd: string): Promise<void> {
  const configPath = path.join(cwd, 'uniskill.yaml');
  const config = await loadConfig(configPath);

  const sourceDir = path.resolve(cwd, config.source);

  let skillDirs: string[];
  try {
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });
    skillDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  } catch {
    console.log(`源目录不存在: ${sourceDir}`);
    return;
  }

  if (skillDirs.length === 0) {
    console.log(`源目录中没有技能: ${sourceDir}`);
    return;
  }

  console.log(`📂 源目录: ${sourceDir}`);
  console.log('');

  for (const skillName of skillDirs) {
    const linkedTargets: string[] = [];

    for (const target of config.targets) {
      const targetPath = path.resolve(expandHome(target.path));
      const skillDir = path.join(targetPath, skillName);

      let isLinked = false;
      if (target.method === 'copy') {
        try {
          const stat = await fs.stat(skillDir);
          isLinked = stat.isDirectory();
        } catch {
          // Directory doesn't exist — not linked
        }
      } else {
        try {
          const linkTarget = await fs.readlink(skillDir);
          const expectedSource = path.resolve(sourceDir, skillName);
          isLinked = path.resolve(linkTarget) === expectedSource;
        } catch {
          // Not linked to this target
        }
      }

      if (isLinked) linkedTargets.push(target.name);
    }

    const targetList = linkedTargets.length > 0
      ? linkedTargets.join(', ')
      : '(未链接)';
    console.log(`  ${skillName}/  → ${targetList}`);
  }
}
