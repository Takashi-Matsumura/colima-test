import { pool } from '@/lib/db';
import { getRedis } from '@/lib/redis';
import { postMessage } from './actions';

export const dynamic = 'force-dynamic';

type MessageRow = {
  id: string;
  body: string;
  created_at: Date;
};

export default async function Home() {
  const redis = await getRedis();
  const visits = await redis.incr('visits');

  const { rows } = await pool.query<MessageRow>(
    'SELECT id, body, created_at FROM messages ORDER BY created_at DESC LIMIT 50'
  );

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-2xl px-6 py-12 flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Colima + Compose Learning Board
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            訪問回数: <span className="font-mono">{visits}</span> (Redis INCR)
          </p>
        </header>

        <form action={postMessage} className="flex flex-col gap-3">
          <textarea
            name="body"
            required
            maxLength={500}
            rows={3}
            placeholder="メッセージを書く（最大 500 文字）"
            className="rounded border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            className="self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90"
          >
            投稿
          </button>
        </form>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            最新メッセージ ({rows.length})
          </h2>
          {rows.length === 0 ? (
            <p className="text-sm text-zinc-500">まだ投稿はありません。</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((m) => (
                <li
                  key={m.id}
                  className="rounded border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <p className="whitespace-pre-wrap text-sm">{m.body}</p>
                  <time
                    dateTime={new Date(m.created_at).toISOString()}
                    className="mt-1 block text-xs text-zinc-500"
                  >
                    {new Date(m.created_at).toLocaleString('ja-JP')}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
