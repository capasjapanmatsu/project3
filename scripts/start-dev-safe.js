const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function checkPortInUse(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    return stdout.trim().length > 0;
  } catch (error) {
    return false;
  }
}

async function startDevServer() {
  console.log('🔍 ポート3000の使用状況を確認中...');
  
  const portInUse = await checkPortInUse(3000);
  
  if (portInUse) {
    console.log('⚠️  開発サーバーは既に起動しています（ポート3000使用中）');
    console.log('📍 http://localhost:3000/ でアクセス可能です');
    return;
  }
  
  console.log('✅ ポート3000は空いています');
  console.log('🚀 開発サーバーを起動中...');
  
  // 開発サーバーを起動
  const devProcess = exec('npm run dev');
  
  devProcess.stdout.on('data', (data) => {
    console.log(data);
  });
  
  devProcess.stderr.on('data', (data) => {
    console.error(data);
  });
  
  devProcess.on('close', (code) => {
    console.log(`開発サーバーが終了しました (code: ${code})`);
  });
  
  // Ctrl+Cでの終了をハンドル
  process.on('SIGINT', () => {
    console.log('\n🛑 開発サーバーを停止中...');
    devProcess.kill('SIGINT');
    process.exit(0);
  });
}

startDevServer().catch(console.error); 