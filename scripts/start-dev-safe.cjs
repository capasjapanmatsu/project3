const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * 指定されたポートが使用中かチェック
 */
async function checkPortInUse(port) {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    return stdout.includes(`LISTENING`);
  } catch (error) {
    // netstatコマンドでエラーが出た場合（結果が空など）は使用されていないと判断
    return false;
  }
}

/**
 * 安全に開発サーバーを起動
 */
async function startDevServer() {
  console.log('🔍 開発サーバーの起動準備中...');
  
  try {
    // ポート3000が使用中かチェック
    const port3000InUse = await checkPortInUse(3000);
    const port3001InUse = await checkPortInUse(3001);
    
    if (port3000InUse) {
      console.log('⚠️  ポート3000は既に使用中です');
    }
    
    if (port3001InUse) {
      console.log('⚠️  ポート3001は既に使用中です');
    }
    
    if (port3000InUse || port3001InUse) {
      console.log('🛑 開発サーバーが既に起動している可能性があります');
      console.log('💡 既存のサーバーを停止してから再実行してください');
      console.log('   taskkill /f /im node.exe (Windows)');
      return;
    }
    
    console.log('✅ ポートが利用可能です。開発サーバーを起動します...');
    
    // npm run dev を実行
    const childProcess = exec('npm run dev', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ 開発サーバー起動エラー:', error);
        return;
      }
    });
    
    // 標準出力を表示
    childProcess.stdout.on('data', (data) => {
      console.log(data.toString());
    });
    
    // エラー出力を表示
    childProcess.stderr.on('data', (data) => {
      console.error(data.toString());
    });
    
    // プロセス終了時の処理
    childProcess.on('close', (code) => {
      console.log(`開発サーバーが終了しました (終了コード: ${code})`);
    });
    
    console.log('🚀 開発サーバー起動コマンドを実行しました');
    console.log('📱 ブラウザで http://localhost:3000 にアクセスしてください');
    
  } catch (error) {
    console.error('❌ 予期しないエラーが発生しました:', error);
  }
}

// メイン実行
startDevServer().catch(console.error); 