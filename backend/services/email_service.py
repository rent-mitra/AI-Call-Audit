import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
from config import (
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USERNAME,
    SMTP_PASSWORD,
    SMTP_FROM,
    SMTP_USE_TLS
)

logger = logging.getLogger("email_service")

# Frontend URLs for account activation and password resetting
FRONTEND_URL = "http://localhost:5173"  # Default Vite dev server URL

def send_email_smtp(to_email: str, subject: str, body_html: str, body_text: str) -> bool:
    """
    Core function to send an email using standard SMTP.
    If no SMTP host is configured, prints the email details to the logs.
    """
    if not SMTP_HOST:
        logger.warning(
            f"\n[EMAIL LOGGER FALLBACK]\n"
            f"To: {to_email}\n"
            f"Subject: {subject}\n"
            f"Text: {body_text}\n"
            f"======================="
        )
        # Return True to simulate successful email delivery during local development
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        # Attach text and html versions
        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        # Connect to SMTP Server
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        if SMTP_USE_TLS:
            server.starttls()
            
        if SMTP_USERNAME and SMTP_PASSWORD:
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            
        server.sendmail(SMTP_FROM, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Email successfully sent to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email} via SMTP: {e}")
        return False

def send_activation_email(to_email: str, token: str, first_name: str) -> bool:
    """Sends an account activation email to a bulk uploaded user."""
    activation_link = f"{FRONTEND_URL}/reset-password?token={token}"
    subject = "Activate Your Call Audit System Account"
    
    body_text = (
        f"Hello {first_name},\n\n"
        f"An account has been created for you on the AI Call Audit System.\n"
        f"Please activate your account and set your password using this link:\n"
        f"{activation_link}\n\n"
        f"This link is secure and valid for 24 hours.\n\n"
        f"Best regards,\nCall Audit Team"
    )
    
    body_html = f"""
    <html>
        <body>
            <h3>Hello {first_name},</h3>
            <p>An account has been created for you on the <strong>AI Call Audit System</strong>.</p>
            <p>Please activate your account and set your password by clicking the button below:</p>
            <p style="margin: 20px 0;">
                <a href="{activation_link}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Activate Account</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="{activation_link}">{activation_link}</a></p>
            <br/>
            <p>This link is secure and valid for 24 hours.</p>
            <p>Best regards,<br/>Call Audit Team</p>
        </body>
    </html>
    """
    return send_email_smtp(to_email, subject, body_html, body_text)

def send_password_reset_email(to_email: str, token: str, first_name: str) -> bool:
    """Sends a password reset email."""
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    subject = "Reset Your Call Audit System Password"
    
    body_text = (
        f"Hello {first_name},\n\n"
        f"We received a request to reset your password for the AI Call Audit System.\n"
        f"Please reset your password using this link:\n"
        f"{reset_link}\n\n"
        f"If you did not request this, you can safely ignore this email.\n\n"
        f"Best regards,\nCall Audit Team"
    )
    
    body_html = f"""
    <html>
        <body>
            <h3>Hello {first_name},</h3>
            <p>We received a request to reset your password for the <strong>AI Call Audit System</strong>.</p>
            <p>Please reset your password by clicking the button below:</p>
            <p style="margin: 20px 0;">
                <a href="{reset_link}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p><a href="{reset_link}">{reset_link}</a></p>
            <br/>
            <p>If you did not request this, you can safely ignore this email.</p>
            <p>Best regards,<br/>Call Audit Team</p>
        </body>
    </html>
    """
    return send_email_smtp(to_email, subject, body_html, body_text)
