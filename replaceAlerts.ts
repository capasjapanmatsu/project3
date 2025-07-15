import { promises as fs } from 'fs';
import path from 'path';

// alert() を notify に置き換える関数
const replaceAlerts = async () => {
  const srcDir = path.join(process.cwd(), 'src');
  
  // 再帰的にファイルを検索
  async function findFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const items = await fs.readdir(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...await findFiles(fullPath));
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  const files = await findFiles(srcDir);
  
  for (const file of files) {
    let content = await fs.readFile(file, 'utf-8');
    let modified = false;
    
    // alert() を notify に置き換える
    const alertReplacements = [
      {
        pattern: /alert\('([^']+)'\);/g,
        replacement: "notify.info('$1');"
      },
      {
        pattern: /alert\("([^"]+)"\);/g,
        replacement: 'notify.info("$1");'
      },
      {
        pattern: /alert\(`([^`]+)`\);/g,
        replacement: 'notify.info(`$1`);'
      }
    ];
    
    // console.log を logger に置き換える
    const logReplacements = [
      {
        pattern: /console\.log\(/g,
        replacement: 'logger.info('
      },
      {
        pattern: /console\.warn\(/g,
        replacement: 'logger.warn('
      },
      {
        pattern: /console\.error\(/g,
        replacement: 'logger.error('
      }
    ];
    
    // 置き換え実行
    for (const { pattern, replacement } of [...alertReplacements, ...logReplacements]) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
    
    // インポート文を追加
    if (modified) {
      if (content.includes('notify.')) {
        if (!content.includes("import { notify }")) {
          const importLine = "import { notify } from '../utils/notification';\n";
          content = content.replace(
            /(import.*from.*;\n)/g,
            `$1${importLine}`
          );
        }
      }
      
      if (content.includes('logger.')) {
        if (!content.includes("import { logger }")) {
          const importLine = "import { logger } from '../utils/logger';\n";
          content = content.replace(
            /(import.*from.*;\n)/g,
            `$1${importLine}`
          );
        }
      }
      
      await fs.writeFile(file, content, 'utf-8');
      console.log(`✅ Updated: ${file}`);
    }
  }
  
  console.log('🎉 All alerts and console.logs have been replaced!');
};

// 実行
replaceAlerts().catch(console.error); 