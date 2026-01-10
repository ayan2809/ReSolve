from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlmodel import Session
from database import engine
from services.notifications import send_daily_review_notification
from settings import settings

scheduler = BackgroundScheduler()

def run_daily_notification_job():
    with Session(engine) as session:
        send_daily_review_notification(session)

def start_scheduler():
    hour, minute = settings.NOTIFICATION_TIME.split(":")
    scheduler.add_job(
        run_daily_notification_job,
        CronTrigger(hour=int(hour), minute=int(minute)),
        id="daily_review_notification",
        replace_existing=True
    )
    scheduler.start()

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
