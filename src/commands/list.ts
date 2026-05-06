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
    console.log(`源目录不存在: ${sourceDir}`);
    return;
  }

  if (skillDirs.length === 0) {
    console.log(`源目录中没有技能: ${sourceDir}`);
    return;
  }

  console.log(`📂 源目录: ${sourceDir}`);
  console.log('');

  // For symlink/junction: check if the entire target directory links to sourceDir
  // For copy: check each skill directory existence inside target
  // Precompute which targets are linked to the source
  const linkedTargetNames: string[] = [];

  for (const target of config.targets) {
    const targetPath = path.resolve(expandHome(target.path));
    let isLinked = false;

    if (target.method === 'copy') {
      // For copy, the target IS the source copy — all skills are present
      try {
        await fs.access(targetPath);
        isLinked = true;
      } catch {
        // Target doesn't exist
      }
    } else {
      // For symlink/junction: check if targetPath points to sourceDir
      try {
        const linkTarget = await fs.readlink(targetPath);
        isLinked = path.resolve(linkTarget) === path.resolve(sourceDir);
      } catch {
        // Not a symlink
      }
    }

    if (isLinked) linkedTargetNames.push(target.name);
  }

  const linkedStr = linkedTargetNames.length > 0 ? linkedTargetNames.join(', ') : null;

  for (const skillName of skillDirs) {
    const targetList = linkedStr ?? '(未链接)';
    console.log(`  ${skillName}/  → ${targetList}`);
  }

  console.log('');
  if (linkedStr) {
    console.log(`✅ 已链接 ${linkedTargetNames.length} 个 target: ${linkedStr}`);
  } else {
    console.log('⚠️ 未检测到已链接的 target');
  }
}
