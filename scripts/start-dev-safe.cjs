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
 * Node.jsプロセスを強制終了
 */
async function killNodeProcesses() {
  try {
    console.log('🔄 既存のNode.jsプロセスを停止しています...');
    await execAsync('taskkill /f /im node.exe');
    console.log('✅ 既存のプロセスを停止しました');
    // プロセス停止後に少し待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    console.log('ℹ️  停止すべきプロセスはありませんでした');
  }
}

/**
 * 安全に開発サーバーを起動（localhost:3000固定）
 */
async function startDevServer() {
  console.log('🔍 開発サーバーの起動準備中...');
  console.log('🎯 目標: localhost:3000での固定起動');
  
  try {
    // ポート3000と3001（HMR用）が使用中かチェック
    const port3000InUse = await checkPortInUse(3000);
    const port3001InUse = await checkPortInUse(3001);
    
    if (port3000InUse || port3001InUse) {
      console.log('⚠️  必要なポートが使用中です:');
      if (port3000InUse) console.log('   - ポート3000 (メインサーバー)');
      if (port3001InUse) console.log('   - ポート3001 (HMR)');
      
      // 自動的にプロセスを停止
      await killNodeProcesses();
      
      // 再チェック
      const port3000StillInUse = await checkPortInUse(3000);
      const port3001StillInUse = await checkPortInUse(3001);
      
      if (port3000StillInUse || port3001StillInUse) {
        console.log('❌ ポートの解放に失敗しました');
        console.log('💡 手動で以下のコマンドを実行してください:');
        console.log('   taskkill /f /im node.exe');
        return;
      }
    }
    
    console.log('✅ ポート3000とポート3001が利用可能です');
    console.log('🚀 開発サーバーを localhost:3000 で起動します...');
    
    // npm run dev を実行（strictPort: trueによりポート3000固定）
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
    
    console.log('🎉 開発サーバー起動完了！');
    console.log('📱 ブラウザで http://localhost:3000 にアクセスしてください');
    console.log('⚡ ホットリロード: http://localhost:3001 (HMR)');
    
  } catch (error) {
    console.error('❌ 予期しないエラーが発生しました:', error);
  }
}

// メイン実行
startDevServer().catch(console.error); 