var j=Object.defineProperty;var N=(n,t,i)=>t in n?j(n,t,{enumerable:!0,configurable:!0,writable:!0,value:i}):n[t]=i;var c=(n,t,i)=>N(n,typeof t!="symbol"?t+"":t,i);import{j as e,m as k}from"./index-B2nIfDq6.js";import{r as h}from"./react-vendor-ClX3xUyT.js";import{f as E}from"./ui-vendor-Bbvw08tP.js";import"./supabase-vendor-CRpuwX9I.js";class I{constructor(){c(this,"deferredPrompt",null);c(this,"registration",null);c(this,"updateAvailable",!1);this.init()}async init(){if(!this.isSupported()){console.warn("⚠️ PWA: このブラウザはService Workerをサポートしていません");return}await this.registerServiceWorker(),this.setupInstallPrompt(),this.setupUpdateDetection(),this.setupConnectionMonitoring(),this.setupBeforeInstallPrompt()}isSupported(){return"serviceWorker"in navigator&&"caches"in window}async registerServiceWorker(){try{this.registration=await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"}),this.registration.addEventListener("updatefound",()=>{this.handleUpdateFound()}),this.registration.active}catch(t){console.error("❌ PWA: Service Worker登録失敗",t),this.showNotification("PWA機能の初期化に失敗しました。一部機能が制限される場合があります。","warning")}}handleUpdateFound(){if(!this.registration)return;const t=this.registration.installing;t&&t.addEventListener("statechange",()=>{t.state==="installed"&&navigator.serviceWorker.controller&&(this.updateAvailable=!0,this.showUpdateNotification())})}showUpdateNotification(){const t=document.createElement("div");t.className="pwa-update-notification",t.innerHTML=`
      <div class="pwa-update-content">
        <div class="pwa-update-icon">🆕</div>
        <div class="pwa-update-text">
          <h4>アプリの新しいバージョンが利用可能です</h4>
          <p>最新の機能とバグ修正を取得するために更新してください。</p>
        </div>
        <div class="pwa-update-actions">
          <button id="pwa-update-btn" class="pwa-btn pwa-btn-primary">
            更新する
          </button>
          <button id="pwa-dismiss-btn" class="pwa-btn pwa-btn-secondary">
            後で
          </button>
        </div>
      </div>
    `,this.addUpdateNotificationStyles(),document.body.appendChild(t),document.getElementById("pwa-update-btn")?.addEventListener("click",()=>{this.applyUpdate(),t.remove()}),document.getElementById("pwa-dismiss-btn")?.addEventListener("click",()=>{t.remove()}),setTimeout(()=>{document.body.contains(t)&&t.remove()},15e3)}addUpdateNotificationStyles(){if(document.getElementById("pwa-update-styles"))return;const t=document.createElement("style");t.id="pwa-update-styles",t.textContent=`
      .pwa-update-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        max-width: 380px;
        border-left: 4px solid #3B82F6;
        animation: slideInRight 0.3s ease-out;
      }
      
      .pwa-update-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .pwa-update-icon {
        font-size: 24px;
        text-align: center;
      }
      
      .pwa-update-text h4 {
        margin: 0 0 8px 0;
        color: #1F2937;
        font-size: 16px;
        font-weight: 600;
      }
      
      .pwa-update-text p {
        margin: 0;
        color: #6B7280;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .pwa-update-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      
      .pwa-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .pwa-btn-primary {
        background: #3B82F6;
        color: white;
      }
      
      .pwa-btn-primary:hover {
        background: #2563EB;
        transform: translateY(-1px);
      }
      
      .pwa-btn-secondary {
        background: #F3F4F6;
        color: #6B7280;
      }
      
      .pwa-btn-secondary:hover {
        background: #E5E7EB;
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @media (max-width: 480px) {
        .pwa-update-notification {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `,document.head.appendChild(t)}applyUpdate(){!this.registration||!this.registration.waiting||(this.registration.waiting.postMessage({type:"SKIP_WAITING"}),window.location.reload())}setupBeforeInstallPrompt(){window.addEventListener("beforeinstallprompt",t=>{t.preventDefault(),this.deferredPrompt=t,this.showInstallBanner()})}showInstallBanner(){if(window.matchMedia("(display-mode: standalone)").matches||document.getElementById("pwa-install-banner"))return;const t=document.createElement("div");t.id="pwa-install-banner",t.className="pwa-install-banner",t.innerHTML=`
      <div class="pwa-install-content">
        <div class="pwa-install-icon">🐕</div>
        <div class="pwa-install-text">
          <h4>ドッグパークJPをインストール</h4>
          <p>ホーム画面に追加して、より快適にご利用ください</p>
        </div>
        <div class="pwa-install-actions">
          <button id="pwa-install-btn" class="pwa-btn pwa-btn-primary">
            インストール
          </button>
          <button id="pwa-install-close" class="pwa-btn pwa-btn-secondary">
            ×
          </button>
        </div>
      </div>
    `,this.addInstallBannerStyles(),document.body.appendChild(t),document.getElementById("pwa-install-btn")?.addEventListener("click",()=>{this.promptInstall()}),document.getElementById("pwa-install-close")?.addEventListener("click",()=>{t.remove(),localStorage.setItem("pwa-install-dismissed",Date.now().toString())});const i=localStorage.getItem("pwa-install-dismissed");if(i&&(Date.now()-parseInt(i))/36e5<24){t.remove();return}}addInstallBannerStyles(){if(document.getElementById("pwa-install-styles"))return;const t=document.createElement("style");t.id="pwa-install-styles",t.textContent=`
      .pwa-install-banner {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: linear-gradient(135deg, #3B82F6, #1D4ED8);
        color: white;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
        z-index: 9999;
        animation: slideInUp 0.3s ease-out;
      }
      
      .pwa-install-content {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .pwa-install-icon {
        font-size: 32px;
        flex-shrink: 0;
      }
      
      .pwa-install-text {
        flex: 1;
      }
      
      .pwa-install-text h4 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .pwa-install-text p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
        line-height: 1.3;
      }
      
      .pwa-install-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      
      .pwa-install-banner .pwa-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .pwa-install-banner .pwa-btn-primary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        backdrop-filter: blur(10px);
      }
      
      .pwa-install-banner .pwa-btn-primary:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
      }
      
      .pwa-install-banner .pwa-btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        width: 32px;
        height: 32px;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .pwa-install-banner .pwa-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
      }
      
      @keyframes slideInUp {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @media (max-width: 480px) {
        .pwa-install-banner {
          bottom: 10px;
          left: 10px;
          right: 10px;
          padding: 12px 16px;
        }
        
        .pwa-install-content {
          gap: 12px;
        }
        
        .pwa-install-icon {
          font-size: 24px;
        }
        
        .pwa-install-text h4 {
          font-size: 14px;
        }
        
        .pwa-install-text p {
          font-size: 12px;
        }
      }
    `,document.head.appendChild(t)}async promptInstall(){if(!this.deferredPrompt)return console.warn("⚠️ PWA: インストールプロンプトが利用できません"),!1;try{await this.deferredPrompt.prompt();const t=await this.deferredPrompt.userChoice;return t.outcome==="accepted"&&this.showNotification("アプリがインストールされました！","success"),this.deferredPrompt=null,document.getElementById("pwa-install-banner")?.remove(),t.outcome==="accepted"}catch(t){return console.error("❌ PWA: インストールプロンプトエラー",t),!1}}setupInstallPrompt(){window.addEventListener("appinstalled",()=>{this.showNotification("ドッグパークJPがインストールされました！","success"),document.getElementById("pwa-install-banner")?.remove(),this.trackEvent("pwa_installed")})}setupUpdateDetection(){document.addEventListener("visibilitychange",()=>{!document.hidden&&this.registration&&this.registration.update()}),setInterval(()=>{this.registration&&this.registration.update()},60*60*1e3)}setupConnectionMonitoring(){const t=()=>{const i=navigator.onLine;i?(this.showNotification("インターネット接続が復帰しました","success"),this.registration&&this.registration.update()):this.showNotification("オフラインモードで動作しています","info"),window.dispatchEvent(new CustomEvent("connectionchange",{detail:{isOnline:i}}))};window.addEventListener("online",t),window.addEventListener("offline",t)}showNotification(t,i="info"){document.querySelectorAll(".pwa-notification").forEach(p=>p.remove());const r=document.createElement("div");r.className=`pwa-notification pwa-notification-${i}`,r.innerHTML=`
      <div class="pwa-notification-content">
        <span class="pwa-notification-icon">${this.getNotificationIcon(i)}</span>
        <span class="pwa-notification-message">${t}</span>
        <button class="pwa-notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `,this.addNotificationStyles(),document.body.appendChild(r),setTimeout(()=>{document.body.contains(r)&&r.remove()},5e3)}getNotificationIcon(t){const i={success:"✅",warning:"⚠️",error:"❌",info:"ℹ️"};return i[t]||i.info}addNotificationStyles(){if(document.getElementById("pwa-notification-styles"))return;const t=document.createElement("style");t.id="pwa-notification-styles",t.textContent=`
      .pwa-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        padding: 12px 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10001;
        max-width: 350px;
        animation: slideInRight 0.3s ease-out;
      }
      
      .pwa-notification-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .pwa-notification-message {
        flex: 1;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .pwa-notification-close {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6B7280;
      }
      
      .pwa-notification-close:hover {
        color: #374151;
      }
      
      .pwa-notification-success {
        border-left: 4px solid #10B981;
      }
      
      .pwa-notification-warning {
        border-left: 4px solid #F59E0B;
      }
      
      .pwa-notification-error {
        border-left: 4px solid #EF4444;
      }
      
      .pwa-notification-info {
        border-left: 4px solid #3B82F6;
      }
      
      @media (max-width: 480px) {
        .pwa-notification {
          top: 10px;
          right: 10px;
          left: 10px;
          max-width: none;
        }
      }
    `,document.head.appendChild(t)}async clearCache(){try{const t=await caches.keys();await Promise.all(t.map(i=>caches.delete(i))),this.registration&&this.registration.active&&this.registration.active.postMessage({type:"CACHE_CLEAR"}),this.showNotification("キャッシュがクリアされました","success")}catch(t){console.error("❌ PWA: キャッシュクリア失敗",t),this.showNotification("キャッシュクリアに失敗しました","error")}}trackEvent(t,i){typeof window.gtag<"u"&&window.gtag("event",t,i)}getStatus(){return{isInstalled:window.matchMedia("(display-mode: standalone)").matches,isOnline:navigator.onLine,hasUpdate:this.updateAvailable,canInstall:!!this.deferredPrompt}}async checkForUpdates(){if(!this.registration)return!1;try{return await this.registration.update(),!0}catch(t){return console.error("❌ PWA: アップデートチェック失敗",t),!1}}}const d=new I;typeof window<"u"&&(window.pwaManager=d);const B=()=>{const[n,t]=h.useState(0),[i,r]=h.useState({isInstalled:!1,isOnline:!0,hasUpdate:!1,canInstall:!1}),p=[{icon:"📱",title:"ホーム画面への追加",description:"アプリをホーム画面に追加してネイティブアプリのように利用",enabled:!0},{icon:"⚡",title:"オフライン機能",description:"インターネット接続がなくても一部機能を利用可能",enabled:!0},{icon:"🔄",title:"自動更新",description:"アプリの新しいバージョンを自動で検出・更新",enabled:!0},{icon:"📊",title:"バックグラウンド同期",description:"オフライン時のデータを接続復帰時に自動同期",enabled:!0},{icon:"🔔",title:"プッシュ通知",description:"重要なお知らせを即座に受信",enabled:!1},{icon:"💾",title:"キャッシュ機能",description:"高速な読み込みとデータ使用量の削減",enabled:!0}],o=[{id:"manifest-check",title:"マニフェスト設定の確認",description:"PWAマニフェストファイルが正しく設定されているか確認します。",instructions:["ブラウザのDevToolsを開く (F12)","Application タブに移動","Manifest セクションを確認","アプリ名、アイコン、表示設定を確認"],code:`{
  "name": "ドッグパークJP",
  "short_name": "ドッグパークJP",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}`,completed:!1},{id:"service-worker-check",title:"Service Worker の確認",description:"Service Workerが正しく登録・動作しているか確認します。",instructions:["DevToolsのApplication タブを開く","Service Workers セクションを確認","登録済みのService Workerを確認",'ステータスが "running" になっているか確認'],completed:!1},{id:"cache-check",title:"キャッシュ機能の確認",description:"アプリリソースが正しくキャッシュされているか確認します。",instructions:["DevToolsのApplication タブを開く","Storage > Cache Storage を確認","キャッシュされたファイル一覧を確認","オフラインモードで動作テスト"],completed:!1},{id:"install-test",title:"インストール機能のテスト",description:"アプリのインストール機能をテストします。",instructions:["ブラウザのアドレスバーにインストールアイコンが表示されるか確認","インストールプロンプトの動作確認","ホーム画面へのアプリ追加を確認","スタンドアロンモードでの起動確認"],completed:!1},{id:"offline-test",title:"オフライン機能のテスト",description:"オフライン時の動作を確認します。",instructions:["DevToolsのNetwork タブを開く",'"Offline" にチェックを入れる',"ページをリロードして動作確認","オフラインページが表示されるか確認"],completed:!1}];h.useEffect(()=>{const s=()=>{const l=d.getStatus();r(l)};s();const a=()=>{s()};return window.addEventListener("connectionchange",a),window.addEventListener("online",s),window.addEventListener("offline",s),()=>{window.removeEventListener("connectionchange",a),window.removeEventListener("online",s),window.removeEventListener("offline",s)}},[]);const m=async()=>{try{await d.promptInstall()&&r(a=>({...a,isInstalled:!0,canInstall:!1}))}catch(s){console.error("PWA install failed:",s)}},x=async()=>{try{await d.clearCache(),window.location.reload()}catch(s){console.error("Cache clear failed:",s)}},g=async()=>{try{await d.checkForUpdates()}catch(s){console.error("Update check failed:",s)}},u=s=>{navigator.clipboard.writeText(s).then(()=>{alert("クリップボードにコピーしました！")})},b=()=>e.jsxs("div",{className:"bg-white rounded-lg shadow-md p-6 mb-8",children:[e.jsx("h2",{className:"text-xl font-bold mb-4",children:"PWA ステータス"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",children:[e.jsxs("div",{className:"flex items-center space-x-3",children:[e.jsx("div",{className:`w-3 h-3 rounded-full ${i.isInstalled?"bg-green-500":"bg-gray-300"}`}),e.jsxs("span",{className:"text-sm",children:["インストール: ",i.isInstalled?"済み":"未完了"]})]}),e.jsxs("div",{className:"flex items-center space-x-3",children:[e.jsx("div",{className:`w-3 h-3 rounded-full ${i.isOnline?"bg-green-500":"bg-orange-500"}`}),e.jsxs("span",{className:"text-sm",children:["接続: ",i.isOnline?"オンライン":"オフライン"]})]}),e.jsxs("div",{className:"flex items-center space-x-3",children:[e.jsx("div",{className:`w-3 h-3 rounded-full ${i.hasUpdate?"bg-blue-500":"bg-gray-300"}`}),e.jsxs("span",{className:"text-sm",children:["更新: ",i.hasUpdate?"利用可能":"最新"]})]}),e.jsxs("div",{className:"flex items-center space-x-3",children:[e.jsx("div",{className:`w-3 h-3 rounded-full ${i.canInstall?"bg-blue-500":"bg-gray-300"}`}),e.jsxs("span",{className:"text-sm",children:["インストール: ",i.canInstall?"可能":"不可"]})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-2 mt-4",children:[i.canInstall&&e.jsx("button",{onClick:()=>void m(),className:"bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700",children:"📱 アプリをインストール"}),e.jsx("button",{onClick:()=>void g(),className:"bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700",children:"🔄 更新確認"}),e.jsx("button",{onClick:()=>void x(),className:"bg-orange-600 text-white px-4 py-2 rounded text-sm hover:bg-orange-700",children:"🗑️ キャッシュクリア"})]})]}),f=()=>e.jsxs("div",{className:"bg-white rounded-lg shadow-md p-6 mb-8",children:[e.jsx("h2",{className:"text-xl font-bold mb-4",children:"PWA 機能"}),e.jsx("div",{className:"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",children:p.map((s,a)=>e.jsx("div",{className:`p-4 rounded-lg border-2 ${s.enabled?"border-green-200 bg-green-50":"border-gray-200 bg-gray-50"}`,children:e.jsxs("div",{className:"flex items-start space-x-3",children:[e.jsx("span",{className:"text-2xl",children:s.icon}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-semibold text-sm mb-1",children:s.title}),e.jsx("p",{className:"text-xs text-gray-600 leading-relaxed",children:s.description}),e.jsx("div",{className:"mt-2",children:e.jsx("span",{className:`inline-block px-2 py-1 rounded text-xs ${s.enabled?"bg-green-100 text-green-800":"bg-gray-100 text-gray-600"}`,children:s.enabled?"有効":"無効"})})]})]})},a))})]}),w=()=>e.jsx("div",{className:"flex items-center mb-8 overflow-x-auto pb-2",children:o.map((s,a)=>e.jsxs("div",{className:"flex items-center flex-shrink-0",children:[e.jsx("div",{className:`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${a<=n?"bg-blue-600 text-white":"bg-gray-200 text-gray-600"}`,children:a+1}),a<o.length-1&&e.jsx("div",{className:`w-16 h-0.5 ${a<n?"bg-blue-600":"bg-gray-200"}`})]},s.id))}),v=()=>{const s=o[n];return s?e.jsxs(k.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"bg-white rounded-lg shadow-md p-6",children:[e.jsx("h2",{className:"text-xl font-bold mb-4",children:s.title}),e.jsx("p",{className:"text-gray-600 mb-6",children:s.description}),e.jsxs("div",{className:"mb-6",children:[e.jsx("h3",{className:"font-semibold mb-3",children:"実施手順:"}),e.jsx("ol",{className:"list-decimal list-inside space-y-2",children:s.instructions.map((a,l)=>e.jsx("li",{className:"text-sm text-gray-700",children:a},l))})]}),s.code&&e.jsxs("div",{className:"bg-gray-50 rounded-lg p-4 mb-6",children:[e.jsxs("div",{className:"flex items-center justify-between mb-2",children:[e.jsx("h4",{className:"font-medium",children:"設定例:"}),e.jsx("button",{onClick:()=>u(s.code),className:"text-blue-600 hover:text-blue-700 text-sm",children:"📋 コピー"})]}),e.jsx("pre",{className:"text-sm overflow-x-auto",children:e.jsx("code",{children:s.code})})]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx("button",{onClick:()=>t(Math.max(0,n-1)),disabled:n===0,className:"bg-gray-300 text-gray-700 px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400",children:"前のステップ"}),e.jsx("div",{className:"flex items-center space-x-2",children:e.jsxs("label",{className:"flex items-center space-x-2",children:[e.jsx("input",{type:"checkbox",checked:s.completed,onChange:a=>{const l=[...o];l[n]&&(l[n].completed=a.target.checked)},className:"rounded"}),e.jsx("span",{className:"text-sm",children:"完了"})]})}),e.jsx("button",{onClick:()=>t(Math.min(o.length-1,n+1)),disabled:n===o.length-1,className:"bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700",children:"次のステップ"})]})]},s.id):e.jsx("div",{className:"bg-white rounded-lg shadow-md p-6",children:e.jsx("p",{className:"text-red-600",children:"ステップが見つかりません。"})})},y=()=>e.jsxs("div",{className:"bg-white rounded-lg shadow-md p-6 mt-8",children:[e.jsx("h2",{className:"text-xl font-bold mb-4",children:"トラブルシューティング"}),e.jsxs("div",{className:"space-y-6",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"font-semibold mb-2",children:"💡 よくある問題と解決方法"}),e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"border-l-4 border-yellow-400 pl-4",children:[e.jsx("h4",{className:"font-medium",children:"Service Worker が登録されない"}),e.jsxs("ul",{className:"text-sm text-gray-600 mt-1 space-y-1",children:[e.jsx("li",{children:"• HTTPSで配信されているか確認"}),e.jsx("li",{children:"• ブラウザがService Workerをサポートしているか確認"}),e.jsx("li",{children:"• コンソールエラーを確認"})]})]}),e.jsxs("div",{className:"border-l-4 border-red-400 pl-4",children:[e.jsx("h4",{className:"font-medium",children:"インストールプロンプトが表示されない"}),e.jsxs("ul",{className:"text-sm text-gray-600 mt-1 space-y-1",children:[e.jsx("li",{children:"• マニフェストファイルが正しく設定されているか確認"}),e.jsx("li",{children:"• HTTPS で配信されているか確認"}),e.jsx("li",{children:"• 既にインストール済みでないか確認"})]})]}),e.jsxs("div",{className:"border-l-4 border-blue-400 pl-4",children:[e.jsx("h4",{className:"font-medium",children:"オフライン機能が動作しない"}),e.jsxs("ul",{className:"text-sm text-gray-600 mt-1 space-y-1",children:[e.jsx("li",{children:"• Service Worker が正しく動作しているか確認"}),e.jsx("li",{children:"• キャッシュが正しく設定されているか確認"}),e.jsx("li",{children:"• オフラインページが存在するか確認"})]})]})]})]}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-semibold mb-2",children:"🔧 開発者向けツール"}),e.jsxs("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[e.jsxs("div",{className:"bg-gray-50 rounded-lg p-4",children:[e.jsx("h4",{className:"font-medium mb-2",children:"Chrome DevTools"}),e.jsx("p",{className:"text-sm text-gray-600 mb-2",children:"Application タブで PWA の状態を確認"}),e.jsx("kbd",{className:"bg-gray-200 px-2 py-1 rounded text-xs",children:"F12 → Application"})]}),e.jsxs("div",{className:"bg-gray-50 rounded-lg p-4",children:[e.jsx("h4",{className:"font-medium mb-2",children:"Lighthouse監査"}),e.jsx("p",{className:"text-sm text-gray-600 mb-2",children:"PWA要件の適合性を自動チェック"}),e.jsx("kbd",{className:"bg-gray-200 px-2 py-1 rounded text-xs",children:"F12 → Lighthouse"})]})]})]})]})]});return e.jsxs("div",{className:"min-h-screen bg-gray-50",children:[e.jsxs(E,{children:[e.jsx("title",{children:"PWA設定ガイド - ドッグパークJP"}),e.jsx("meta",{name:"description",content:"ドッグパークJPのプログレッシブ・ウェブ・アプリ機能の設定と確認方法について詳しく説明します。"})]}),e.jsxs("div",{className:"max-w-4xl mx-auto px-4 py-8",children:[e.jsxs("div",{className:"text-center mb-8",children:[e.jsx("h1",{className:"text-3xl font-bold text-gray-900 mb-4",children:"📱 PWA設定ガイド"}),e.jsx("p",{className:"text-lg text-gray-600",children:"プログレッシブ・ウェブ・アプリ機能の設定と動作確認"})]}),b(),f(),w(),v(),y(),e.jsxs("div",{className:"bg-white rounded-lg shadow-md p-6 mt-8",children:[e.jsx("h2",{className:"text-xl font-bold mb-4",children:"📚 参考リソース"}),e.jsxs("div",{className:"grid md:grid-cols-2 gap-4",children:[e.jsxs("div",{className:"space-y-2",children:[e.jsx("h3",{className:"font-semibold",children:"公式ドキュメント"}),e.jsx("a",{href:"https://web.dev/progressive-web-apps/",target:"_blank",rel:"noopener noreferrer",className:"text-blue-600 hover:text-blue-700 block text-sm",children:"Progressive Web Apps | web.dev"}),e.jsx("a",{href:"https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps",target:"_blank",rel:"noopener noreferrer",className:"text-blue-600 hover:text-blue-700 block text-sm",children:"PWA | MDN Web Docs"})]}),e.jsxs("div",{className:"space-y-2",children:[e.jsx("h3",{className:"font-semibold",children:"開発ツール"}),e.jsx("a",{href:"https://developers.google.com/web/tools/lighthouse",target:"_blank",rel:"noopener noreferrer",className:"text-blue-600 hover:text-blue-700 block text-sm",children:"Lighthouse"}),e.jsx("a",{href:"https://web.dev/pwa-checklist/",target:"_blank",rel:"noopener noreferrer",className:"text-blue-600 hover:text-blue-700 block text-sm",children:"PWA Checklist"})]})]})]})]})]})};export{B as default};
