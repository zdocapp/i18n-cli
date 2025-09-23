#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from '../commands/init.js';
import { runCommand } from '../commands/run.js';
import { checkCommand } from '../commands/check.js';

const program = new Command();

program.name('i18n').description('A CLI tool for managing multilingual translations').version('0.1.0');

program.addCommand(initCommand);
program.addCommand(runCommand);
program.addCommand(checkCommand);

program.parse(process.argv);
