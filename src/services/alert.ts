// src/services/alert.ts
import { logger } from '../utils/logger';

interface AlertData {
  projectId: string;
  groupId: string;
  message: string;
  level: string;
  fingerprint: string;
}

export async function sendAlert(data: AlertData): Promise<void> {
  // MVP: just log it
  // Production: send email via SendGrid, Slack via webhook, etc.
  
  logger.warn(`🚨 NEW ERROR ALERT`, {
    projectId: data.projectId,
    groupId: data.groupId,
    level: data.level,
    fingerprint: data.fingerprint,
    message: data.message.substring(0, 200),
  });
  
  // TODO: Integrate with email service
  // await sendEmail({ to: project.ownerEmail, subject: 'New Error', ... });
  
  // TODO: Integrate with Slack
  // await sendSlackMessage({ channel: '#alerts', text: `New error: ${data.message}` });
}