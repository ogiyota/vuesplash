# 1.プロジェクトの作成

### vuesplash 　配下に web と database ディレクトリの作成

## Docker 変更について

### PHP のバージョン変更

FROM php:7.4.1-fpm 　 → 　 FROM php:8.2.0-fpm

### node のバージョン変更 (vue3 を使用するため)

&& curl -sL https://deb.nodesource.com/setup_lts.x | bash - \
&& apt-get install -y nodejs \
現在の Dockerfile では、Node.js 12.x を使用していますが、最新の LTS（Long-Term Support）バージョンを使用することが推奨されます。また node のバージョンが低いことから新しいライブラリのインストール時にエラーの要因となりやすいです。

### コンテナの再ビルド

docker-compose build
以前のコンテナをキャッシュしている場合は立ち上げは早いが Dockerfile の変更点が反映されないので再度ビルドする
その後に
docker-compose up -d

docker ps（実行中のコンテナを確認できる）コマンドで確認

### laravel の install

docker-compose exec vuesplash_web bash 　コンテナにログインを行う

node -v で最新版の node か確認
php -v 　 php のバージョンが 8.2 か確認
composer create-project --prefer-dist laravel/laravel .　 laravel の最新版を install (今回は 10)

### サーバーの立ち上げ

php artisan serve --host 0.0.0.0 --port 8081

### laravel の初期設定

config/app.php の locale 設定を日本語にします。
'locale' => 'ja',

### .env にデータベースの情報を入れる

DB_CONNECTION=pgsql
DB_HOST=vuesplash_database
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres
DB_PASSWORD=secret

vuesplash_database は docker-compose.yml で指定したサービス名

## フロントの準備

新規ターミナルを開き
再度、docker-compose exec vuesplash_web bash でコンテナにログイン

npm install

### laravel mix を使用する

Laravel に標準に備わっているコンパイル機能により Webpack などの設定作業を行う必要がない
具体的には Webpack を利用しフロントエンドをビルドしますが、設定を容易にするために Laravel Mix を使用
ビルドの際に設定ファイル webpack.mix.cjs が参照され、Webpack の設定が動的に生成される。

npm install laravel-mix --save-dev 　開発時に必要なパッケージとしてインストール
touch webpack.mix.cjs ファイルの作成

### vue3 の install

npm install -D vue@3 　　　-D = --save-dev の省略

### webpack.mix.cjs の編集

```webpack.mix.cjs

const mix = require('laravel-mix')

mix.browserSync({
proxy: '0.0.0.0:8081',
open: false
})
.js('resources/js/app.js', 'public/js')
.version()

```

このように編集

browserSync = JavaScript や PHP ファイルが変更されたときに自動的にブラウザがリロードされるようになります。

js = 第一引数がコンパイル対象のファイル、第二引数がコンパイル結果の配置先

version = ブラウザは一度取得したファイルをキャッシュに保存する、その為コードの変更をしても反映されない。
　　　　　　 version()とすることでビルドするたびにコンパイルしたファイルの URL にランダムな文字列を付けて
　　　　　　ブラウザがキャッシュを読まないようにします。

<script src="/js/app.js?id=87459a9d906e11120dd5" defer=""></script>

上記のような URL になる。※コンパイルの度にランダムに生成

### 画面をレスポンスするコードの記述

HTML を返すのは一度のみ、その後は component の切り替えと Ajax によって JSON データを取得し中身を変えていく

### routes/web.php を編集

```routes/web.php

Route::get('/{any?}', function () {
return view('index');
})->where('any', '.+');

```

{any?} = 渡されるパラメータがあってもなくても良い
view('index') = index テンプレートを返す(index.blade.php)
where('any', '.+'); = any(渡される値)が(.+)任意の文字列 1 文字以上

※where = ルートのパラメータに対する制約を指定するために使用される

このルーティング定義により、全ての GET リクエストに対して、URI の任意の文字列を index ビューにルーティングすることが可能。
例（/hahjdhfjdhfdud）この URL にアクセスしても index テンプレートが返される

### テンプレート作成

先程の view('index');の部分のテンプレートを作成します。

resources/views/に index.blade.php を作成
更に welcome.blade.php は不要なので
以下のコマンドを実行

rm resources/views/welcome.blade.php 　で削除
touch resources/views/index.blade.php 　で作成

### index.blade.php を編集

```resources/views/index.blade.php

<!doctype html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ config('app.name') }}</title>

  <!-- Scripts -->
  <script src="{{ mix('js/app.js') }}" defer></script>

  <!-- Fonts -->
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Merriweather|Roboto:400">
  <link rel="stylesheet" href="https://unpkg.com/ionicons@4.2.2/dist/css/ionicons.min.css">

</head>
<body>
  <div id="app"></div>
</body>
</html>

```

<div id="app"></div>ここにvueアプリが描画され、どんなURLにアクセスされてもこの<div id="app"></div>が参照されるようになる

### resources/js/app.js の編集

以下のように編集します。

```app.js

import { createApp } from 'vue';

const app = createApp({
template: '<h1>Hello world</h1>'
});

app.mount('#app');

```

### webpack.mix.cjs を編集

```webpack.mix.cjs

const mix = require('laravel-mix')
const path = require('path');

mix.browserSync({
proxy: '0.0.0.0:8081',
open: false
})
.js('resources/js/app.js', 'public/js')
.version()

mix.webpackConfig({
    resolve: {
      alias: {
        'vue$': path.resolve(__dirname, 'node_modules/vue/dist/vue.esm-bundler.js'),
      },
    },
    plugins: [
      new (require('webpack')).DefinePlugin({
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false,
      }),
    ],
  });


```

全体でこのようなコードになります。
laravel プロジェクト内で vue を動かす際に、vue のインポート時にこれらの記述をしないと worning が出ます。
・resolve.alias で、vue パッケージをインポートする際に、vue/dist/vue.esm-bundler.js を使用するようにエイリアス設定してる。
・plugins に DefinePlugin を追加し、Vue の機能フラグ（**VUE_OPTIONS_API**と**VUE_PROD_DEVTOOLS**）を定義しています。これにより、機能フラグが未定義の警告が解消されます。**VUE_OPTIONS_API**を true に設定して、オプション API を有効化し、**VUE_PROD_DEVTOOLS**を false に設定して、プロダクション環境での Vue Devtools の使用を無効化している

## npm run watch

cross-env をインストールすることにより異なるシステム環境(windows や mac)では環境変数の設定方法が違う
それを同じ設定方法を可能にするのが cross-env

以下コマンド実行
npm install cross-env --save-dev

package.json の script を参照
---development---
開発用のビルドを実行するためのもので、 cross-env パッケージを使用して、 NODE_ENV 環境変数に development という値を設定している。 NODE_ENV 環境変数は、Node.js において環境の種類を表すために使用され、開発環境であることを示す development を設定することで、Webpack によるビルド時に適切な設定が適用されるようになる。

簡単に言ってしまうと、開発環境でビルドする上での必要な script

npm run watch 　コマンドの実行

初回は wacth に必要な npm パッケージのインストールを行うので再度 npm run watch コマンドを実行
実行後　[http://localhost:3000]　にアクセスして 'hello world'が出力されているか確認。

## Vue Router の導入

vue router を使用することによって擬似的なページ遷移が可能となる（SPA となる）

npm install vue-router -D 　コマンド実行

## App.vue の作成 (ルートコンポーネント)

ルートコンポーネントとはツリー構造においての頂点の部分に位置するもの
HTML なら　<HTML></HTML>を指す
このルートコンポーネントが<div id="app"></div>に描画される仕組みにする
その他のコンポーネントは、この App.vue より呼び出し表示を可能にする

<RouterView /> このコンポーネントは Vue Router によって提供されている SPA を可能にしてくれるもの
具体的にはこの　<RouterView />　内に様々なコンポーネントが入れ替わり擬似的なページ遷移を可能にする

touch resources/js/App.vue 　で作成

以下編集

```resources/js/App.vue

<template>
  <div>
    <main>
      <div class="container">
        <RouterView />
      </div>
    </main>
  </div>
</template>

```

## ページコンポーネントの作成

次にページコンポーネントの作成をします（<RouterView /> に適用させるコンポーネント）

pages ディレクトリを resources/js に作成
mkdir resources/js/pages でディレクトリ作成

### PhotoList.vue の作成

touch resources/js/pages/PhotoList.vue 　でファイル作成

以下に編集

```resources/js/pages/PhotoList.vue

<template>
  <h1>Photo List</h1>
</template>

```

### Login.vue の作成

touch resources/js/pages/Login.vue 　でファイル作成

以下に編集

```resources/js/pages/Login.vue

<template>
  <h1>Login</h1>
</template>

```

## ルーティング定義

URL に応じてどのコンポーネントを表示させるかを定義していきます

/Login 　という URL にアクセスしたら Login.vue を　<RouterView />　に入れ表示させるような仕組み

### vue loader のインストール

.vue ファイルを読み込む為に必要なパッケージ
npm install --save-dev vue-loader コマンドでインストール

### webpack.mix.js の編集

vue loader の設定を記述する

```wbpack.mix.js

const mix = require('laravel-mix');
const path = require('path');

mix.browserSync({
  proxy: '0.0.0.0:8081',
  open: false,
})
  .js('resources/js/app.js', 'public/js')
  .vue()
  .version();

mix.webpackConfig({
  resolve: {
    alias: {
      vue$: path.resolve(__dirname, 'node_modules/vue/dist/vue.esm-bundler.js'),
    },
  },
});

```

だいぶスッキリさせた書き方に変えました。
vue3 からは vue()を使用することで自動で様々な設定をしてくれます。

### resources/js/router.js の作成 (ルーティング定義ファイル)

touch resources/js/router.js でファイル作成

以下に編集

```resources/js/router.js

import { createRouter, createWebHistory } from 'vue-router'
import PhotoList from './pages/PhotoList.vue'
import Login from './pages/Login.vue'

const routes = [
  {
    path: '/',
    component: PhotoList
  },
  {
    path: '/login',
    component: Login
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router

```

### vue3 と vue-router4 ではデフォルトでヒストリーモードが ON になります。

vue2 では URL に/#/とついていましたが、vue3 ではデフォルトで/#/がなくなっています。
ここまでできましたら / と/login にアクセスして正常に動作しているか確認してみましょう。

# 認証 API について

API と画面遷移に関する URL は別で記述した方がわかりやすいので web.php ではなく api.php に記述します。
また、そのためには少しデフォルトの定義を変更する必要があります。

###　 app/Providers/RouteServiceProvider.php とは
Laravel アプリケーションにおいて全てのルートの設定を管理する役割を持つファイル

そもそもミドルウェアとは？　= リクエスト　 → ミドルウェア　 → ルート　のような中間処理に位置するもの
リクエストに対して特定の処理を追加したり、リクエストを検証したり、必要な認証や認可を実行したりするために使用される
具体的には、アプリケーション全体のリクエストに対し、共通の機能やロジックを適用させるためのもの
認証ミドルウェアはユーザーが認証されているかのチェックを行い、認証されていない場合はログインページにリダイレクトさせたりなど

### app/Providers/RouteServiceProvider.php の編集

```app/Providers/RouteServiceProvider.php

<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * This is used by Laravel authentication to redirect users after login.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, etc.
     *
     * @return void
     */
    public function boot()
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::prefix('api')
                ->middleware('web') // ★ 'api' → 'web' に変更
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    /**
     * Configure the rate limiters for the application.
     *
     * @return void
     */
    protected function configureRateLimiting()
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by(optional($request->user())->getKey());
        });
    }
}


```

この変更により、api のプレフィックスが付いたルートは全て web ミドルウェアを通過するようになります。
prefix(プレフィックス)とは = API エンドポイントへのリクエストに対して適用される URL の接頭辞を指す。
GET /api/users
POST /api/users

Route::prefix('api')
->middleware('web')
api が接頭辞なので このリクエストが送信された場合は web ミドルウェアを通る。
prefix を定義することで、リクエストで処理を分けることが可能となる。

##　テストの準備

インメモリの SQLite を利用するのでテスト実行が終わると消去され無駄なデータが残りません。

### config/database.php の connections に以下の接続情報を追加

```config/database.php

'sqlite_testing' => [
    'driver' => 'sqlite',
    'database' => ':memory:',
    'prefix' => '',
],

```

### phpunit.xml に DB 設定を追記

```phpunit.xml

    <env name="APP_ENV" value="testing"/>
    <env name="DB_CONNECTION" value="sqlite_testing"/> <!-- ★ 追加 -->
    <!-- 以下略 -->

```

## I / O 設定　（会員登録 API）

簡単に Input（リクエストデータ）と Output（レスポンス）を設計します。

### リクエスト

デフォルトの通り name email password password_confirmation を受け取ります。

### レスポンス

デフォルトの挙動では登録成功後には定義されたページにリダイレクトするレスポンスを返しますが、今回は SPA なのでいつどのページに遷移するかはフロントエンドでコントロールします。

### テストコード作成

php artisan make:test RegisterApiTest 　でテストコード作成
