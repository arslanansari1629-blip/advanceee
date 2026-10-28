/**
 * Tiny document store.
 *
 * BotForge keeps its state in a single `docs(collection, id, doc jsonb)` table
 * when DATABASE_URL is present (Postgres / Neon / Supabase), and in a JSON file
 * otherwise. One code path, two backends — so the app runs with zero setup and
 * scales properly in production.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type Coll = "users" | "sessions" | "bots" | "logs" | "meta";
export interface Doc {
  id: string;
  [key: string]: unknown;
}

interface Backend {
  get(c: Coll, id: string): Promise<Doc | null>;
  put(c: Coll, id: string, doc: Record<string, unknown>): Promise<void>;
  del(c: Coll, id: string): Promise<void>;
  all(c: Coll): Promise<Doc[]>;
}

/* ------------------------------------------------------------------ file */

class FileBackend implements Backend {
  private file: string;
  private data: Record<string, Record<string, Doc>>;
  private writeChain: Promise<void> = Promise.resolve();

  constructor() {
    const dir =
      process.env.DATA_DIR ||
      (process.env.VERCEL ? "/tmp/botforge" : path.join(process.cwd(), ".data"));
    fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "db.json");
    this.data = {};
    try {
      this.data = JSON.parse(fs.readFileSync(this.file, "utf8"));
    } catch {
      this.data = {};
    }
  }

  private persist() {
    const snapshot = JSON.stringify(this.data);
    this.writeChain = this.writeChain.then(
      () =>
        new Promise<void>((resolve) => {
          fs.writeFile(this.file + ".tmp", snapshot, (err) => {
            if (err) return resolve();
            fs.rename(this.file + ".tmp", this.file, () => resolve());
          });
        })
    );
    return this.writeChain;
  }

  async get(c: Coll, id: string) {
    return this.data[c]?.[id] ?? null;
  }
  async put(c: Coll, id: string, doc: Record<string, unknown>) {
    (this.data[c] ||= {})[id] = doc as Doc;
    await this.persist();
  }
  async del(c: Coll, id: string) {
    if (this.data[c]) delete this.data[c][id];
    await this.persist();
  }
  async all(c: Coll) {
    return Object.values(this.data[c] ?? {});
  }
}

/* -------------------------------------------------------------- postgres */

class PgBackend implements Backend {
  private pool: any = null;
  private ready: Promise<void> | null = null;

  private async connect() {
    if (!this.ready) {
      this.ready = (async () => {
        const { default: pg } = await import("pg");
        const ssl =
          process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false };
        this.pool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          ssl,
          max: 5,
        });
        await this.pool.query(
          `create table if not exists docs (
             collection text not null,
             id text not null,
             doc jsonb not null,
             primary key (collection, id)
           )`
        );
      })();
    }
    return this.ready;
  }

  async get(c: Coll, id: string) {
    await this.connect();
    const r = await this.pool.query("select doc from docs where collection=$1 and id=$2", [c, id]);
    return (r.rows[0]?.doc as Doc) ?? null;
  }
  async put(c: Coll, id: string, doc: Record<string, unknown>) {
    await this.connect();
    await this.pool.query(
      `insert into docs (collection, id, doc) values ($1,$2,$3)
       on conflict (collection, id) do update set doc = excluded.doc`,
      [c, id, JSON.stringify(doc)]
    );
  }
  async del(c: Coll, id: string) {
    await this.connect();
    await this.pool.query("delete from docs where collection=$1 and id=$2", [c, id]);
  }
  async all(c: Coll) {
    await this.connect();
    const r = await this.pool.query("select doc from docs where collection=$1", [c]);
    return r.rows.map((row: any) => row.doc as Doc);
  }
}

/* ----------------------------------------------------------------- store */

const globalForStore = globalThis as unknown as { __botforgeDb?: Backend };

export function backend(): Backend {
  if (!globalForStore.__botforgeDb) {
    globalForStore.__botforgeDb = process.env.DATABASE_URL
      ? new PgBackend()
      : new FileBackend();
  }
  return globalForStore.__botforgeDb;
}

export const storageMode = () => (process.env.DATABASE_URL ? "postgres" : "file");

export const uid = (prefix = "") =>
  prefix + crypto.randomBytes(9).toString("base64url").toLowerCase();

export const db = {
  get: (c: Coll, id: string) => backend().get(c, id),
  put: (c: Coll, id: string, doc: Record<string, unknown>) => backend().put(c, id, doc),
  del: (c: Coll, id: string) => backend().del(c, id),
  all: (c: Coll) => backend().all(c),
};
