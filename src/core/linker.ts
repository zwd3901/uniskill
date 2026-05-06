import fs from 'fs/promises';
import path from 'path';
import { LinkMethod, LinkStatus, LinkResult } from '../types';

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
