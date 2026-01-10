import logging
import requests
from sqlmodel import Session, select
from datetime import date
from typing import List

from models import ReviewSchedule
from settings import settings

logger = logging.getLogger(__name__)

class NotificationService:
    def notify(self, message: str):
        raise NotImplementedError

class ConsoleNotification(NotificationService):
    def notify(self, message: str):
        print(f"\n[NOTIFICATION] >>>\n{message}\n<<<\n")
        logger.info(f"Notification sent: {message}")

class DiscordNotification(NotificationService):
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url

    def notify(self, message: str):
        if not self.webhook_url:
            return
        payload = {"content": message}
        try:
            requests.post(self.webhook_url, json=payload)
        except Exception as e:
            logger.error(f"Failed to send Discord notification: {e}")

def get_notifier() -> NotificationService:
    return ConsoleNotification()

def send_daily_review_notification(session: Session):
    today = date.today()
    reviews = session.exec(
        select(ReviewSchedule)
        .where(ReviewSchedule.status == "pending")
        .where(ReviewSchedule.scheduled_date == today)
    ).all()
    
    if not reviews:
        logger.info("No reviews for today.")
        return

    message = f"**ReSolve Daily Reviews ({today})**\n"
    message += f"You have {len(reviews)} problems to review:\n\n"
    
    for r in reviews:
        problem_title = r.problem.title if r.problem else f"Problem #{r.problem_id}"
        message += f"- {problem_title} ({r.interval_label})\n"
        
    notifier = get_notifier()
    notifier.notify(message)
