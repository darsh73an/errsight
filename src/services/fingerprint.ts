// src/services/fingerprint.ts
import crypto from 'crypto';

interface ErrorEvent {
  message: string;
  stack?: string | null;
  level?: string;
}

/**
 * Generate a fingerprint for error grouping.
 * Same fingerprint = same error group.
 */
export function generateFingerprint(event: ErrorEvent): string {
  // 1. Normalize message (remove variable parts)
  const normalizedMessage = normalizeMessage(event.message);
  
  // 2. Extract key stack frame (first app frame, not library)
  const keyFrame = extractKeyFrame(event.stack);
  
  // 3. Combine into fingerprint string
  const fingerprintString = `${event.level || 'error'}:${normalizedMessage}:${keyFrame}`;
  
  // 4. Hash it (SHA256, take first 16 chars for readability)
  return crypto
    .createHash('sha256')
    .update(fingerprintString)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Remove variable parts from error message
 * "user 42 not found" -> "user * not found"
 */
function normalizeMessage(message: string): string {
  return message
    // Replace numbers with *
    .replace(/\b\d+\b/g, '*')
    // Replace hex IDs (mongo, uuid fragments)
    .replace(/\b[0-9a-f]{8,}\b/gi, '*')
    // Replace emails
    .replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, '*')
    // Replace URLs
    .replace(/https?:\/\/[^\s]+/g, '*')
    // Replace file paths
    .replace(/\/[\w\/\.-]+/g, '*')
    // Replace quoted strings
    .replace(/['"][^'"]*['"]/g, '*')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .substring(0, 200); // limit length
}

/**
 * Extract the most relevant stack frame
 * Skip library frames, find first app frame
 */
function extractKeyFrame(stack: string | null | undefined): string {
  if (!stack) return 'no-stack';
  
  const lines = stack.split('\n');
  
  // Look for first frame that's likely app code (not node_modules)
  for (const line of lines) {
    // Skip empty lines
    if (!line.trim()) continue;
    
    // Skip library frames
    if (line.includes('node_modules')) continue;
    
    // Skip internal node frames
    if (line.includes('internal/')) continue;
    
    // Extract function name and file:line
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
    if (match) {
      const [, funcName, filePath, lineNum] = match;
      // Normalize: remove path, keep filename only
      const fileName = filePath.split('/').pop() || filePath;
      // Remove line number (changes across versions)
      return `${funcName || 'anonymous'}@${fileName}`;
    }
  }
  
  // Fallback: use first line if no app frame found
  return lines[0]?.substring(0, 100) || 'unknown';
}

/**
 * Check if two errors should be grouped together
 * (for testing/debugging)
 */
export function shouldGroup(event1: ErrorEvent, event2: ErrorEvent): boolean {
  return generateFingerprint(event1) === generateFingerprint(event2);
}