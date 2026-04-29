# Colima + Docker Compose 学習用サンプル

Next.js 16 + PostgreSQL + Redis の 3 サービスを Docker Compose で立ち上げて、Colima 上でコンテナ化を学ぶためのミニアプリです。

題材は「メッセージボード + 訪問カウンター」:

- **PostgreSQL**: 投稿メッセージを永続化
- **Redis**: ページ訪問回数を `INCR` でカウント
- **Next.js (App Router)**: フォーム + 一覧 + カウンター表示

---

## 事前準備

```bash
brew install colima docker docker-compose
colima start --cpu 4 --memory 4 --disk 30
docker context use colima   # Docker Desktop と共存している場合
docker info                 # Server が見えれば OK
```

> Apple Silicon 上では `postgres:17-alpine` も `redis:7-alpine` も `node:22-alpine` もすべて arm64 ネイティブイメージが提供されます。`platform:` 指定は不要です。

---

## Step 1: DB だけコンテナで起動 (Next.js はホストで dev)

普段の開発体験に近い構成。ホットリロードを使いつつ、DB は使い捨てコンテナに任せます。

```bash
docker compose up -d postgres redis
cp .env.example .env.local
npm install
npm run dev
```

→ http://localhost:3000

ポイント:

- `DATABASE_URL=postgres://app:app@localhost:5432/board` のように **localhost** を指している。ホスト側 → Docker のポート公開 (`5432:5432`) を経由してコンテナ内 PG に接続している。

停止:

```bash
docker compose stop postgres redis
```

---

## Step 2: 3 サービスすべてコンテナで起動

学習の到達点。Next.js もイメージにビルドし、Compose ネットワーク内で `postgres` / `redis` というサービス名で名前解決する。

```bash
docker compose down            # Step 1 のコンテナを止める
docker compose up --build       # web を含めてビルド + 起動
```

→ http://localhost:3000

ポイント:

- `compose.yaml` の `web.environment.DATABASE_URL` は `postgres://app:app@postgres:5432/board`。ホスト名が **`postgres`** に変わっている。これは Compose が同一ネットワーク (`appnet`) のサービスに DNS を提供しているため。
- `depends_on.condition: service_healthy` で PG / Redis の healthcheck がパスしてから web を起動。順序問題が発生しない。

---

## Step 3: 観察コマンド

```bash
docker compose ps                      # healthy 表示を確認
docker volume ls                       # pgdata, redisdata が見える
docker network inspect colima-test_appnet
docker compose logs -f web             # アプリログを追跡
docker image ls                        # standalone ビルドの軽さを確認
```

---

## Step 4: 永続化の体感

```bash
# PG に直接クエリを投げる
docker compose exec postgres psql -U app -d board -c 'SELECT * FROM messages;'

# Redis のカウンターを確認
docker compose exec redis redis-cli GET visits

# コンテナだけ削除 → ボリュームは残る
docker compose down
docker compose up -d
# → 投稿もカウンターも残っている

# ボリュームごと削除
docker compose down -v
docker compose up --build
# → messages テーブルが SQL から再作成され、カウンターは 1 から
```

`/docker-entrypoint-initdb.d/01_schema.sql` は **PostgreSQL の volume が空のときだけ** 実行される、という挙動を体感できます。

---

## ファイル構成

```
.
├── compose.yaml             # 3 サービス + 2 volume + 1 network
├── Dockerfile               # マルチステージ + standalone 出力
├── .dockerignore
├── .env.example             # Step 1 用テンプレ (localhost を指す)
├── db/init/01_schema.sql    # 初回起動時のみ走る DDL
├── lib/db.ts                # pg Pool シングルトン
├── lib/redis.ts             # redis client 遅延接続シングルトン
├── app/
│   ├── actions.ts           # Server Action (投稿)
│   ├── page.tsx             # フォーム + 一覧 + カウンター
│   └── layout.tsx
└── next.config.ts           # output: 'standalone'
```

---

## 既知の罠

- **ポート衝突**: ホストですでに 5432 / 6379 を使っているなら `compose.yaml` のホスト側を `15432:5432` のように変える (`.env.local` も合わせて変更)
- **ビルドが極端に遅い**: `.dockerignore` が効いているか確認。`node_modules` `.next` が build context に含まれていないこと
- **dev もコンテナで動かしたい**: macOS + Colima の bind-mount は遅め。学習目的を超えて開発体験が必要な場合のみ検討
