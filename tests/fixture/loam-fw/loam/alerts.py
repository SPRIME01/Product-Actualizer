"""Low-moisture alerts."""
import os
import smtplib
from email.message import EmailMessage

THRESHOLD = 0.25  # alert below this level


def should_alert(percent):
    return percent < THRESHOLD


def send_email(to, percent):
    msg = EmailMessage()
    msg["To"] = to
    msg["From"] = "loam@localhost"
    msg["Subject"] = "Your plant needs water"
    msg.set_content(f"Soil moisture is {percent:.0f}%.")
    with smtplib.SMTP(os.environ["SMTP_HOST"]) as s:
        s.send_message(msg)


def send_sms(to, percent):
    # TODO: pick an SMS provider
    raise NotImplementedError
