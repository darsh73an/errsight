// src/services/scrubber.ts

export function scrubPII(text: string): string {
  if (!text) return text;
  
  return text
    // Emails
    .replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, '[EMAIL]')
    // Credit cards (basic pattern)
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')
    // JWT tokens
    .replace(/\beyJ[\w-]*\.[\w-]*\.[\w-]*\b/g, '[TOKEN]')
    // API keys (long alphanumeric)
    .replace(/\b[A-Za-z0-9]{32,}\b/g, '[API_KEY]')
    // Passwords in common formats
    .replace(/password["\s]*[:=]["\s]*[^\s,"}]+/gi, 'password:[REDACTED]')
    // SSN
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
}