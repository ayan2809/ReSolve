from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import ProgrammingError
from settings import settings
import sys

def create_database():
    # Connect to default 'postgres' database to create the target database
    default_url = settings.DATABASE_URL.rsplit('/', 1)[0] + '/postgres'
    engine = create_engine(default_url, isolation_level="AUTOCOMMIT")
    
    db_name = settings.DATABASE_URL.rsplit('/', 1)[1]
    
    try:
        with engine.connect() as conn:
            # Check if database exists
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"))
            if not result.scalar():
                print(f"Creating database '{db_name}'...")
                conn.execute(text(f"CREATE DATABASE {db_name}"))
                print(f"Database '{db_name}' created successfully.")
            else:
                print(f"Database '{db_name}' already exists.")
    except Exception as e:
        print(f"Error checking/creating database: {e}")
        # Proceeding anyway as it might exist and we just failed to check (permissions)
        # But if we can't connect at all, the next steps will fail.
        # Check if we can connect to the target DB
        try:
             target_engine = create_engine(settings.DATABASE_URL)
             with target_engine.connect() as conn:
                 print("Successfully connected to target database.")
        except Exception as e2:
             print(f"Could not connect to target database: {e2}")
             sys.exit(1)

if __name__ == "__main__":
    create_database()
