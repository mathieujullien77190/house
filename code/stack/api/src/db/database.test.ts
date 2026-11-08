import assert from 'node:assert/strict'
import { join } from 'node:path'
import { test } from 'node:test'
import { createDatabaseFile, withTempDir } from '../testing/helpers.ts'
import { DatabaseNotReady, openDatabase } from './database.ts'

test('une base absente donne DatabaseNotReady, à chaque demande', async () => {
  await withTempDir((dir) => {
    const db = openDatabase(join(dir, 'absente.db'))
    assert.throws(() => db.all('SELECT 1'), DatabaseNotReady)
    assert.throws(() => db.get('SELECT 1'), DatabaseNotReady)
    // jamais ouverte : rien à fermer
    db.close()
  })
})

test('la base est lue en lecture seule, la connexion est gardée', async () => {
  await withTempDir((dir) => {
    const file = join(dir, 'events.db')
    createDatabaseFile(file, "CREATE TABLE t (a INTEGER, b TEXT); INSERT INTO t VALUES (1, 'x'), (2, 'y');")
    const db = openDatabase(file)
    try {
      // les lignes de SQLite n'ont pas de prototype : on les copie pour comparer
      const rows = db.all<{ a: number }>('SELECT a FROM t WHERE a >= ? ORDER BY a', 1).map((row) => ({ ...row }))
      assert.deepEqual(rows, [{ a: 1 }, { a: 2 }])
      assert.equal(db.get<{ b: string }>('SELECT b FROM t WHERE a = ?', 2)?.b, 'y')
      assert.equal(db.get('SELECT b FROM t WHERE a = ?', 9), undefined)
      assert.throws(() => db.all("INSERT INTO t VALUES (3, 'z')"), /readonly/i)
      db.close()
      // fermée, elle se rouvre au besoin
      assert.equal(db.get<{ b: string }>('SELECT b FROM t WHERE a = ?', 1)?.b, 'x')
    } finally {
      db.close()
    }
  })
})
