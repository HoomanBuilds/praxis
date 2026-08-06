from db import migrate
from db.session import _portable_ddl_type


class FakeInspector:
    def __init__(self, tables: list[str]):
        self.tables = tables

    def get_table_names(self) -> list[str]:
        return self.tables


def test_empty_database_runs_all_migrations(monkeypatch):
    calls = []
    monkeypatch.setattr(migrate, "get_engine", lambda: object())
    monkeypatch.setattr(migrate, "inspect", lambda _engine: FakeInspector([]))
    monkeypatch.setattr(migrate.command, "upgrade", lambda _config, revision: calls.append(("upgrade", revision)))

    migrate.migrate_database()

    assert calls == [("upgrade", "head")]


def test_existing_legacy_database_is_brought_to_baseline(monkeypatch):
    calls = []
    monkeypatch.setattr(migrate, "get_engine", lambda: object())
    monkeypatch.setattr(migrate, "inspect", lambda _engine: FakeInspector(["users", "documents"]))
    monkeypatch.setattr(migrate, "init_db", lambda: calls.append(("init", None)))
    monkeypatch.setattr(migrate.command, "stamp", lambda _config, revision: calls.append(("stamp", revision)))

    migrate.migrate_database()

    assert calls == [("init", None), ("stamp", "head")]


def test_versioned_database_runs_pending_migrations(monkeypatch):
    calls = []
    monkeypatch.setattr(migrate, "get_engine", lambda: object())
    monkeypatch.setattr(migrate, "inspect", lambda _engine: FakeInspector(["alembic_version", "users"]))
    monkeypatch.setattr(migrate.command, "upgrade", lambda _config, revision: calls.append(("upgrade", revision)))

    migrate.migrate_database()

    assert calls == [("upgrade", "head")]


def test_legacy_datetime_column_uses_postgres_type():
    assert _portable_ddl_type("postgresql", "DATETIME") == "TIMESTAMP"
    assert _portable_ddl_type("sqlite", "DATETIME") == "DATETIME"
