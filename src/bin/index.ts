#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from '../commands/init.js';
import { runCommand } from '../commands/run.js';
import { checkCommand } from '../commands/check.js';
import { exportCommand } from '../commands/export.js';

const program = new Command();

program.name('i18n').description('A CLI tool for managing multilingual translations').version('0.0.6');

program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(checkCommand);
program.addCommand(exportCommand);

program.parse(process.argv);
