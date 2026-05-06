#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init';
import { linkCommand } from './commands/link';
import { listCommand } from './commands/list';
import { unlinkCommand } from './commands/unlink';
import { statusCommand } from './commands/status';
import { watchCommand } from './commands/watch';

import pkg from '../package.json';

const program = new Command();

program
  .name('uniskill')
  .description('Unified AI Agent Skill manager — sync skills across multiple agents')
  .version(pkg.version);

program
  .command('init')
  .description('Generate uniskill.yaml configuration template')
  .action(() => {
    initCommand(process.cwd()).catch((err) => {
      console.error('错误:', (err as Error).message);
      process.exit(1);
    });
  });

program
  .command('link')
  .description('Create symlinks from source to all targets')
  .option('--target <name>', 'Only link the specified target')
  .option('--dry-run', 'Show what would be done without actually doing it')
  .action((options) => {
    linkCommand(process.cwd(), options).catch((err) => {
      console.error('错误:', (err as Error).message);
      process.exit(1);
    });
  });

program
  .command('unlink')
  .description('Remove all symlinks (does not delete source files)')
  .option('--target <name>', 'Only unlink the specified target')
  .action((options) => {
    unlinkCommand(process.cwd(), options).catch((err) => {
      console.error('错误:', (err as Error).message);
      process.exit(1);
    });
  });

program
  .command('status')
  .description('Check link status for all targets')
  .action(() => {
    statusCommand(process.cwd()).catch((err) => {
      console.error('错误:', (err as Error).message);
      process.exit(1);
    });
  });

program
  .command('list')
  .description('List all skills and their linked targets')
  .action(() => {
    listCommand(process.cwd()).catch((err) => {
      console.error('错误:', (err as Error).message);
      process.exit(1);
    });
  });

program
  .command('watch')
  .description('Watch source directory for changes and auto-sync')
  .action(() => {
    watchCommand(process.cwd()).catch((err) => {
      console.error('错误:', (err as Error).message);
      process.exit(1);
    });
  });

program.parse(process.argv);
