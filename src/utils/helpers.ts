import crypto from 'crypto';

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function generateApiKey(): string {
  return `es_${crypto.randomBytes(24).toString('hex')}`;
}

export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function truncate(str: string, max: number): string {
  if (!str) return str;
  return str.length > max ? `${str.slice(0, max)}...` : str;
}

export function paginationParams(query: any): { limit: number; offset: number; page: number } {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 25, 1), 100);
  const offset = (page - 1) * limit;
  return { limit, offset, page };
}
