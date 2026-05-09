import fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import { checkStatus, createLink, backupAndLink } from './linker';
import { Target } from '../types';

// ── Backward-compatible existing API ──

const DEBOUNCE_MS = 500;

export interface Watcher {
  close: () => Promise<void>;
}

export async function startWatch(
  watchDir: string,
  onChange: () => void,
): Promise<Watcher> {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const watcher = chokidar.watch(watchDir, {
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  });

  const debouncedOnChange = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      onChange();
      debounceTimer = null;
    }, DEBOUNCE_MS);
  };

  watcher.on('add', debouncedOnChange);
  watcher.on('change', debouncedOnChange);
  watcher.on('unlink', debouncedOnChange);

  return {
    close: async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await watcher.close();
    },
  };
}

// ── New: EventLogger ──

export type LogLevel = 'INFO' | 'HEALTH' | 'ACTION' | 'WARN' | 'ERROR';

const LOG_PREFIX: Record<LogLevel, string> = {
  INFO: '  ℹ️ ',
  HEALTH: '  ✅ ',
  ACTION: '  🔧 ',
  WARN: '  ⚠️ ',
  ERROR: '  ❌ ',
};

const MAX_LOG_SIZE = 1024 * 1024; // 1MB auto-rotate threshold

export class EventLogger {
  private filePath: string;
  private stream: import('fs').WriteStream | null = null;
  private ready = false;
  private pending: string[] = [];

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  async init(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const s = require('fs').createWriteStream(this.filePath, {
      flags: 'a',
      encoding: 'utf-8',
    });
    this.stream = s;
    this.ready = true;
    for (const line of this.pending) {
      s.write(line + '\n');
    }
    this.pending = [];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const time = new Date().toISOString().replace('T', ' ').slice(0, 19);
    return `[${time}]  ${level.padEnd(6)}  ${message}`;
  }

  log(level: LogLevel, message: string): void {
    const line = this.formatMessage(level, message);
    console.log(`${LOG_PREFIX[level]}${message}`);
    const stream = this.stream;
    if (stream && this.ready) {
      stream.write(line + '\n');
      if (stream.bytesWritten >= MAX_LOG_SIZE) {
        this.rotate();
      }
    } else {
      this.pending.push(line);
    }
  }

  private rotate(): void {
    if (!this.stream) return;
    try {
      this.stream.end();
      this.stream = null;
      this.ready = false;
      // Rename current log -> .1 (overwrite old rotated)
      const bak = this.filePath + '.1';
      require('fs').renameSync(this.filePath, bak);
      // Re-open fresh
      this.stream = require('fs').createWriteStream(this.filePath, {
        flags: 'a',
        encoding: 'utf-8',
      });
      this.ready = true;
    } catch {
      // Rotate failed — reopen append stream
      this.stream = require('fs').createWriteStream(this.filePath, {
        flags: 'a',
        encoding: 'utf-8',
      });
      this.ready = true;
    }
  }

  info(message: string): void { this.log('INFO', message); }
  health(message: string): void { this.log('HEALTH', message); }
  action(message: string): void { this.log('ACTION', message); }
  warn(message: string): void { this.log('WARN', message); }
  error(message: string): void { this.log('ERROR', message); }

  close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.stream) {
        this.stream.end(resolve);
      } else {
        resolve();
      }
    });
  }
}

// ── New: WatchManager ──

const HEALTH_INTERVAL_MS = 30000;
const LOG_FILE_NAME = '.uniskill-watch.log';

export interface WatchManagerConfig {
  sourceDir: string;
  targets: Target[];
  logFile?: string;
  healthIntervalMs?: number;
}

export async function createWatchManager(config: WatchManagerConfig): Promise<Watcher> {
  const sourceDir = path.resolve(config.sourceDir);
  const logFile = config.logFile || path.join(path.dirname(sourceDir), LOG_FILE_NAME);
  const healthInterval = config.healthIntervalMs || HEALTH_INTERVAL_MS;

  const logger = new EventLogger(logFile);
  await logger.init();

  logger.info(`开始监听源目录: ${sourceDir}`);
  logger.info(`共 ${config.targets.length} 个 target`);

  // ── Health check ──
  const healthCheck = async (): Promise<void> => {
    for (const target of config.targets) {
      const targetPath = path.resolve(target.path);

      const status = await checkStatus(targetPath, sourceDir);

      switch (status) {
        case 'linked':
          break;

        case 'missing': {
          const result = await createLink(sourceDir, targetPath);
          if (result.success) {
            logger.action(`${target.name}: 链接丢失，已重建`);
          } else {
            logger.error(`${target.name}: 创建链接失败 — ${result.detail}`);
          }
          break;
        }

        case 'broken': {
          logger.warn(`${target.name}: 源目录 ${sourceDir} 不存在，链接悬空`);
          break;
        }

        case 'conflict': {
          const result = await backupAndLink(sourceDir, targetPath);
          if (result.success) {
            const bakInfo = result.backupPath ? `（备份至 ${result.backupPath}）` : '';
            logger.action(`${target.name}: 检测到冲突，已备份并重建链接${bakInfo}`);
          } else {
            logger.error(`${target.name}: 处理冲突失败 — ${result.detail}`);
          }
          break;
        }
      }
    }
  };

  // Run initial health check
  await healthCheck();

  // ── Source directory watcher (for change logging) ──
  const sourceWatcher = chokidar.watch(sourceDir, {
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  });

  sourceWatcher.on('add', (filePath: string) => {
    const rel = path.isAbsolute(filePath) ? path.relative(sourceDir, filePath) : filePath;
    logger.info(`新增: skills/${rel}`);
  });

  sourceWatcher.on('change', (filePath: string) => {
    const rel = path.isAbsolute(filePath) ? path.relative(sourceDir, filePath) : filePath;
    logger.info(`修改: skills/${rel}`);
  });

  sourceWatcher.on('unlink', (filePath: string) => {
    const rel = path.isAbsolute(filePath) ? path.relative(sourceDir, filePath) : filePath;
    logger.info(`删除: skills/${rel}`);
  });

  // ── Health check timer ──
  const healthTimer = setInterval(healthCheck, healthInterval);

  // ── Watcher handle ──
  return {
    close: async () => {
      clearInterval(healthTimer);
      await sourceWatcher.close();
      await logger.close();
    },
  };
}
