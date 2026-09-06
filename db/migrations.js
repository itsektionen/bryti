const id = (column) =>
  `${column} NOT GLOB '*[^0-9]*' AND length(${column}) BETWEEN 16 AND 20`;

export const migrations = [
  {
    version: 1,
    up(db) {
      db.exec(`
        CREATE TABLE settings (
          guild_id TEXT NOT NULL CHECK (${id('guild_id')}),
          key      TEXT NOT NULL,
          value    TEXT NOT NULL,
          PRIMARY KEY (guild_id, key)
        );

        CREATE TABLE reception_roles (
          guild_id        TEXT NOT NULL CHECK (${id('guild_id')}),
          slug            TEXT NOT NULL CHECK (slug IN ('nollan', 'ingen', 'mux', 'fadder', 'doq')),
          role_id         TEXT CHECK (${id('role_id')}),
          name            TEXT,
          primary_color   INTEGER,
          secondary_color INTEGER,
          tertiary_color  INTEGER,
          PRIMARY KEY (guild_id, slug)
        );

        CREATE TABLE reception (
          guild_id            TEXT PRIMARY KEY CHECK (${id('guild_id')}),
          state               TEXT NOT NULL CHECK (state IN ('off', 'running', 'ended')),
          year                INTEGER,
          category_id         TEXT CHECK (${id('category_id')}),
          archive_category_id TEXT CHECK (${id('archive_category_id')}),
          started_at          INTEGER
        );

        CREATE TABLE reception_groups (
          guild_id   TEXT NOT NULL CHECK (${id('guild_id')}),
          name       TEXT NOT NULL,
          role_id    TEXT CHECK (${id('role_id')}),
          channel_id TEXT CHECK (${id('channel_id')}),
          PRIMARY KEY (guild_id, name)
        );

        CREATE TABLE role_backup (
          guild_id        TEXT NOT NULL CHECK (${id('guild_id')}),
          role_id         TEXT NOT NULL CHECK (${id('role_id')}),
          primary_color   INTEGER,
          secondary_color INTEGER,
          tertiary_color  INTEGER,
          hoist           INTEGER NOT NULL CHECK (hoist IN (0, 1)),
          stripped_at     INTEGER,
          restored_at     INTEGER,
          PRIMARY KEY (guild_id, role_id)
        );

        CREATE INDEX role_backup_open ON role_backup (guild_id) WHERE restored_at IS NULL;

        CREATE TABLE onboarding_backup (
          guild_id      TEXT PRIMARY KEY CHECK (${id('guild_id')}),
          snapshot_json TEXT NOT NULL,
          taken_at      INTEGER NOT NULL
        );

        CREATE TABLE pending (
          id           TEXT PRIMARY KEY,
          kind         TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at   INTEGER NOT NULL,
          expires_at   INTEGER NOT NULL
        );

        CREATE INDEX pending_expires ON pending (expires_at);
      `);
    },
  },
];
