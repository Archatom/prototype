const { exec } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');

// 設定
const WATCH_FILE = './data/articles.json';
let isDeploying = false;
let pendingDeploy = false;

console.log('');
console.log('========================================');
console.log('  🚀 StockX 自動部署工具');
console.log('========================================');
console.log('');
console.log(`👀 正在監控: ${WATCH_FILE}`);
console.log('📝 修改 JSON 檔案後將自動部署到 GitHub');
console.log('⏹️  按 Ctrl+C 停止監控');
console.log('');
console.log('----------------------------------------');
console.log('');

// 部署函數
function deploy() {
    if (isDeploying) {
        pendingDeploy = true;
        console.log('⏳ 部署中，稍後將再次部署...');
        return;
    }

    isDeploying = true;
    const timestamp = new Date().toLocaleString('zh-TW');
    
    console.log(`📦 [${timestamp}] 偵測到變更，開始部署...`);
    console.log('');

    const commands = [
        'git add .',
        `git commit -m "更新文章資料 - ${timestamp}"`,
        'git push origin main'
    ].join(' && ');

    exec(commands, { cwd: path.resolve(__dirname) }, (error, stdout, stderr) => {
        isDeploying = false;

        if (error) {
            // 檢查是否是「沒有變更」的情況
            if (error.message.includes('nothing to commit')) {
                console.log('ℹ️  沒有新的變更需要提交');
            } else {
                console.log('❌ 部署失敗:');
                console.log(error.message);
            }
        } else {
            console.log('✅ 部署成功！');
            console.log('🌐 網站將在 1-2 分鐘後更新');
            console.log('');
        }

        console.log('----------------------------------------');
        console.log('👀 繼續監控中...');
        console.log('');

        // 如果有待處理的部署，執行它
        if (pendingDeploy) {
            pendingDeploy = false;
            setTimeout(deploy, 2000);
        }
    });
}

// 防抖動函數（避免連續儲存觸發多次部署）
let debounceTimer = null;
function debouncedDeploy() {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
        deploy();
        debounceTimer = null;
    }, 1000); // 等待 1 秒後再部署
}

// 開始監控
const watcher = chokidar.watch(WATCH_FILE, {
    persistent: true,
    ignoreInitial: true
});

watcher
    .on('change', (filePath) => {
        console.log(`📝 檔案已修改: ${path.basename(filePath)}`);
        debouncedDeploy();
    })
    .on('error', (error) => {
        console.log(`❌ 監控錯誤: ${error}`);
    });

// 處理程式結束
process.on('SIGINT', () => {
    console.log('');
    console.log('👋 停止監控，再見！');
    watcher.close();
    process.exit();
});
