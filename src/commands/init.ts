import fs from 'fs/promises';
import path from 'path';
import { generateTemplate } from '../core/config';

export async function initCommand(cwd: string): Promise<void> {
  const configPath = path.join(cwd, 'uniskill.yaml');

  try {
    await fs.access(configPath);
    console.log(`配置文件已存在: ${configPath}`);
    return;
  } catch {
    // File doesn't exist — proceed
  }

  const template = generateTemplate();
  await fs.writeFile(configPath, template, 'utf-8');
  console.log(`已创建配置文件: ${configPath}`);
}
