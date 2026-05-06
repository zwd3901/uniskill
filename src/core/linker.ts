import fs from 'fs/promises';
import path from 'path';
import { LinkStatus, LinkResult } from '../types';

function getDefaultMethod(): 'junction' | 'symlink' {
  return process.platform === 'win32' ? 'junction' : 'symlink';
}

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

  // Create the link — platform adaptive
  const method = getDefaultMethod();
  const linkType = method === 'junction' ? 'junction' as any : 'dir';
  try {
    await fs.symlink(resolvedSource, target, linkType);
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
    try {
      await fs.access(targetPath);
      return 'conflict';
    } catch {
      return 'missing';
    }
  }

  try {
    await fs.access(resolvedSource);
  } catch {
    return 'broken';
  }

  return 'linked';
}

export async function removeLink(target: string): Promise<void> {
  try {
    await fs.access(target);
  } catch {
    return; // Already gone — skip
  }

  await fs.unlink(target);
}
