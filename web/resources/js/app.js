import './bootstrap.js';
import { createApp } from 'vue';
import router from './router.js'; // ルーティングの定義をインポートする
import App from './App.vue'; // ルートコンポーネントをインポートする

const app = createApp(App); // アプリケーションインスタンスを作成
app.use(router); // ルーティングの定義を読み込む
app.mount('#app'); // アプリケーションをマウント