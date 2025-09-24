// release.ts
import { execSync } from 'child_process';
import fs from 'fs';

function run(cmd: string) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

function updateIndexVersion(newVersion: string) {
  const filePath = 'src/bin/index.ts';
  const content = fs.readFileSync(filePath, 'utf-8');

  const updated = content.replace(/\.version\(['"]([\d.]+)['"]\)/, `.version('${newVersion}')`);

  fs.writeFileSync(filePath, updated);
  console.log(`✅ Updated ${filePath} version -> ${newVersion}`);
}

/**
 * node --loader ts-node/esm script/release.ts patch   # 补丁版本 +0.0.1
 * node --loader ts-node/esm script/release.ts minor   # 次版本 +0.1.0
 * node --loader ts-node/esm script/release.ts major   # 主版本 +1.0.0
 */
function main() {
  const bumpType = process.argv[2] || 'patch'; // 默认 patch

  // 1. 用 npm version 修改 package.json 和生成 git tag（先去掉 git 部分）
  run(`npm version ${bumpType} --no-git-tag-version`);
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const newVersion = pkg.version;

  // 2. 同步更新 src/bin/index.ts
  updateIndexVersion(newVersion);

  // 3. git commit & push
  run('git add .');
  run(`git commit -m "chore: release v${newVersion}"`);
  run('git push origin main');

  // 4. 打 tag 并 push
  run(`git tag v${newVersion}`);
  run('git push --tags');

  // 5. npm publish
  run('npm publish --access public');

  console.log(`🎉 Release v${newVersion} done!`);
}

main();
