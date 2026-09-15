const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { readFileSync, readdirSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const { Client } = require("pg");

// Requires an explicit disposable test database; never defaults to the application database.
test(
  "withdrawal cascades, isolates accounts and prevents concurrent resurrection",
  {
    skip: !process.env.WITHDRAWAL_TEST_DATABASE_URL,
  },
  async () => {
    const connectionString = process.env.WITHDRAWAL_TEST_DATABASE_URL;
    const db = new Client({ connectionString });
    const writer = new Client({ connectionString });
    const schema = `withdrawal_${randomUUID().replaceAll("-", "")}`;
    await db.connect();
    await writer.connect();
    try {
      await db.query(`CREATE SCHEMA ${schema}`);
      await db.query(`SET search_path TO ${schema}`);
      await writer.query(`SET search_path TO ${schema}`);
      await writer.query("SET statement_timeout TO '5s'");
      const migrations = path.resolve(__dirname, "../prisma/migrations");
      for (const name of readdirSync(migrations)
        .filter((entry) => /^\d/.test(entry))
        .toSorted()) {
        // oxlint-disable-next-line no-await-in-loop -- Migrations must execute in order.
        await db.query(readFileSync(path.join(migrations, name, "migration.sql"), "utf8"));
      }
      await db.query(`
      INSERT INTO users (id,email,nickname) VALUES ('removed','removed@test','removed'),('kept','kept@test','kept');
      INSERT INTO games (id,user_id,color,difficulty,status,result,ended_reason,ended_at) VALUES
        ('finished','removed','black','normal','active',NULL,NULL,NULL),('kept-game','kept','white','easy','active',NULL,NULL,NULL);
      INSERT INTO moves (id,game_id,ply,san) VALUES ('move','finished',1,'e4');
      UPDATE games SET status='finished',result='win',ended_reason='checkmate',ended_at=NOW() WHERE id='finished';
      INSERT INTO games (id,user_id,color,difficulty) VALUES ('active','removed','white','easy');
      INSERT INTO game_analysis (id,game_id,ply,eval_cp,classification) VALUES ('analysis','finished',1,0,'good');
      INSERT INTO refresh_sessions (id,user_id,token_hash,expires_at) VALUES ('session','removed','hash',NOW()+INTERVAL '1 day');
      INSERT INTO oauth_accounts (id,user_id,provider,provider_account_id) VALUES ('oauth','removed','google','google-id');
    `);
      await db.query("BEGIN");
      await db.query("DELETE FROM users WHERE id='removed'");
      // This writer races with an uncommitted deletion; FK checks wait for the deletion to finish.
      const pendingWrite = writer
        .query(
          "INSERT INTO game_analysis (id,game_id,ply,eval_cp,classification) VALUES ('late','finished',2,0,'good')",
        )
        .then(
          () => null,
          (error) => error.code,
        );
      await db.query("COMMIT");
      assert.equal(await pendingWrite, "23503");
      for (const table of ["moves", "game_analysis", "refresh_sessions", "oauth_accounts"]) {
        // oxlint-disable-next-line no-await-in-loop -- Inspect each dependent table.
        assert.equal((await db.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count, 0);
      }
      assert.deepEqual((await db.query("SELECT id FROM users")).rows, [{ id: "kept" }]);
      assert.deepEqual((await db.query("SELECT id FROM games")).rows, [{ id: "kept-game" }]);
      await assert.rejects(
        writer.query("INSERT INTO games (id,user_id,color,difficulty) VALUES ('late','removed','white','easy')"),
        { code: "23503" },
      );
      assert.equal((await db.query("DELETE FROM users WHERE id='removed'")).rowCount, 0);
      await db.query("INSERT INTO users (id,email,nickname) VALUES ('new','removed@test','removed')");
    } finally {
      await db.query("ROLLBACK");
      await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await Promise.all([db.end(), writer.end()]);
    }
  },
);
