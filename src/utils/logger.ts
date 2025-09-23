import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

// 日志文件存放路径（可根据需要配置）
const logDir = path.resolve(process.cwd(), '.i18n');
const logFile = path.join(logDir, 'log');

// 确保日志目录存在
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function writeLog(level: string, msg: string) {
  const time = new Date().toISOString();
  const line = `[${time}] [${level}] ${msg}\n`;
  fs.appendFileSync(logFile, line, 'utf8');
}

export const logger = {
  info: (msg: string) => {
    console.log(chalk.blue('[INFO]'), msg);
    writeLog('INFO', msg);
  },
  success: (msg: string) => {
    console.log(chalk.green('[OK]'), msg);
    writeLog('OK', msg);
  },
  warn: (msg: string) => {
    console.log(chalk.yellow('[WARN]'), msg);
    writeLog('WARN', msg);
  },
  error: (msg: string) => {
    console.log(chalk.red('[ERROR]'), msg);
    writeLog('ERROR', msg);
  },
};
