from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
import logging

logger = logging.getLogger(__name__)

# Die Base muss global sein für Model-Definitionen
Base = declarative_base()

# Standard-Engine für die Datenbank
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Dependency für FastAPI Routes um DB-Session zu erhalten.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
