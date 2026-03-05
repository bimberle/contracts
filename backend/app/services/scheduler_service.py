"""
Scheduler Service
Handles scheduled backup jobs using APScheduler
"""
import logging
from datetime import datetime
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

# Global scheduler instance
_scheduler: Optional[BackgroundScheduler] = None

# Day name to cron day mapping (APScheduler uses 0=Monday style like Python)
DAY_NAME_TO_CRON = {
    "monday": "mon",
    "tuesday": "tue", 
    "wednesday": "wed",
    "thursday": "thu",
    "friday": "fri",
    "saturday": "sat",
    "sunday": "sun"
}


def get_scheduler() -> BackgroundScheduler:
    """Get or create the scheduler instance"""
    global _scheduler
    if _scheduler is None:
        _scheduler = BackgroundScheduler()
        _scheduler.start()
        logger.info("✅ APScheduler started")
    return _scheduler


def scheduled_backup_job():
    """
    The actual backup job that runs on schedule.
    This is called by APScheduler at the configured times.
    """
    from app.database import SessionLocal
    from app.models.backup import BackupConfig, BackupHistory
    from app.models.customer import Customer
    from app.models.contract import Contract
    from app.services import backup_service
    from app.config import settings
    
    logger.info("=" * 50)
    logger.info("🕐 Scheduled backup job starting...")
    logger.info(f"   Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("=" * 50)
    
    db = SessionLocal()
    try:
        # Get database name from config
        url = settings.DATABASE_URL
        db_name = url.rsplit("/", 1)[-1]
        
        # Check if database exists
        if not backup_service.database_exists(db_name):
            logger.error(f"❌ Database '{db_name}' does not exist!")
            return
        
        # Count records before backup
        customer_count = db.query(Customer).count()
        contract_count = db.query(Contract).count()
        
        logger.info(f"   Database: {db_name}")
        logger.info(f"   Customers: {customer_count}, Contracts: {contract_count}")
        
        # Create backup
        success, result, filepath = backup_service.create_backup(db_name)
        
        # Get or create config to update last backup status
        config = db.query(BackupConfig).filter(BackupConfig.id == "default").first()
        if not config:
            config = BackupConfig(id="default")
            db.add(config)
        
        if success:
            config.last_backup_at = datetime.now()
            config.last_backup_status = "success"
            
            # Save to history
            import os
            from app.main import BACKEND_VERSION
            
            file_size = os.path.getsize(filepath) if filepath and os.path.exists(filepath) else 0
            
            history_entry = BackupHistory(
                filename=result,
                database_name=db_name,
                file_size=file_size,
                customer_count=customer_count,
                contract_count=contract_count,
                app_version=BACKEND_VERSION,
                status="success"
            )
            db.add(history_entry)
            
            # Cleanup old backups
            max_backups = config.max_backups or 7
            backup_service.cleanup_old_backups(max_backups, db_name)
            
            logger.info(f"✅ Scheduled backup completed: {result}")
        else:
            config.last_backup_at = datetime.now()
            config.last_backup_status = "failed"
            logger.error(f"❌ Scheduled backup failed: {result}")
        
        db.commit()
        
    except Exception as e:
        logger.error(f"❌ Scheduled backup exception: {str(e)}")
        db.rollback()
    finally:
        db.close()


def update_backup_schedule(schedule_days: list, schedule_time: str, is_enabled: bool):
    """
    Update the backup schedule based on configuration.
    
    Args:
        schedule_days: List of day names like ["monday", "tuesday", ...]
        schedule_time: Time string like "03:00"
        is_enabled: Whether the schedule is enabled
    """
    scheduler = get_scheduler()
    job_id = "scheduled_backup"
    
    # Remove existing job if any
    existing_job = scheduler.get_job(job_id)
    if existing_job:
        scheduler.remove_job(job_id)
        logger.info("🗑️ Removed existing backup schedule")
    
    if not is_enabled:
        logger.info("⏸️ Backup schedule is disabled")
        return
    
    if not schedule_days:
        logger.warning("⚠️ No schedule days configured, backup schedule disabled")
        return
    
    # Parse time
    try:
        hour, minute = schedule_time.split(":")
        hour = int(hour)
        minute = int(minute)
    except (ValueError, AttributeError):
        logger.error(f"❌ Invalid schedule time format: {schedule_time}, using 03:00")
        hour, minute = 3, 0
    
    # Convert day names to cron format
    cron_days = []
    for day in schedule_days:
        day_lower = day.lower() if isinstance(day, str) else day
        if day_lower in DAY_NAME_TO_CRON:
            cron_days.append(DAY_NAME_TO_CRON[day_lower])
        elif isinstance(day_lower, int) and 0 <= day_lower <= 6:
            # Also accept numeric days (0=Monday)
            day_names = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
            cron_days.append(day_names[day_lower])
    
    if not cron_days:
        logger.warning("⚠️ No valid schedule days, backup schedule disabled")
        return
    
    day_of_week = ",".join(cron_days)
    
    # Create cron trigger
    trigger = CronTrigger(
        day_of_week=day_of_week,
        hour=hour,
        minute=minute
    )
    
    # Add job
    scheduler.add_job(
        scheduled_backup_job,
        trigger=trigger,
        id=job_id,
        name="Scheduled Database Backup",
        replace_existing=True
    )
    
    logger.info(f"✅ Backup schedule configured:")
    logger.info(f"   Days: {schedule_days}")
    logger.info(f"   Time: {schedule_time}")
    logger.info(f"   Next run: {scheduler.get_job(job_id).next_run_time}")


def initialize_scheduler_from_db():
    """
    Initialize the scheduler with configuration from the database.
    Called on application startup.
    """
    from app.database import SessionLocal
    from app.models.backup import BackupConfig
    
    logger.info("🔧 Initializing backup scheduler from database...")
    
    db = SessionLocal()
    try:
        config = db.query(BackupConfig).filter(BackupConfig.id == "default").first()
        
        if config:
            logger.info(f"   Found config: enabled={config.is_enabled}, days={config.schedule_days}, time={config.schedule_time}")
            update_backup_schedule(
                schedule_days=config.schedule_days or [],
                schedule_time=config.schedule_time or "03:00",
                is_enabled=config.is_enabled if config.is_enabled is not None else True
            )
        else:
            logger.info("   No backup config found, creating default...")
            # Create default config
            config = BackupConfig(
                id="default",
                schedule_days=["monday", "tuesday", "wednesday", "thursday", "friday"],
                schedule_time="03:00",
                max_backups=7,
                is_enabled=True
            )
            db.add(config)
            db.commit()
            
            update_backup_schedule(
                schedule_days=config.schedule_days,
                schedule_time=config.schedule_time,
                is_enabled=config.is_enabled
            )
            
    except Exception as e:
        logger.error(f"❌ Error initializing scheduler: {str(e)}")
    finally:
        db.close()


def shutdown_scheduler():
    """Shutdown the scheduler gracefully"""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        logger.info("🛑 APScheduler shutdown")
        _scheduler = None


def get_next_backup_time() -> Optional[datetime]:
    """Get the next scheduled backup time"""
    scheduler = get_scheduler()
    job = scheduler.get_job("scheduled_backup")
    if job:
        return job.next_run_time
    return None
