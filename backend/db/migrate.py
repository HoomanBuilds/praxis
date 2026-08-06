from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from db.session import get_engine, init_db


def migrate_database() -> None:
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    tables = set(inspect(get_engine()).get_table_names())

    if "alembic_version" in tables or not tables:
        command.upgrade(config, "head")
        return

    init_db()
    command.stamp(config, "head")


if __name__ == "__main__":
    migrate_database()
