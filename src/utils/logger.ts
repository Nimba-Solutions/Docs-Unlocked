// Helper to safely serialize objects for console logging in Salesforce
export const safeStringify = (obj: any): string => {
  try {
    if (obj === null || obj === undefined) return String(obj);
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (obj instanceof Error) {
      return `Error: ${obj.message}${obj.stack ? '\n' + obj.stack : ''}`;
    }
    return JSON.stringify(obj, (_key, value) => {
      if (value instanceof Error) {
        return { name: value.name, message: value.message, stack: value.stack };
      }
      return value;
    }, 2);
  } catch (e) {
    return String(obj);
  }
};

// Helper for safe console logging
export const safeLog = (message: string, ...args: any[]) => {
  const serialized = args.map(arg => safeStringify(arg)).join(' ');
  console.log(`[DocsUnlocked] ${message}${serialized ? ' ' + serialized : ''}`);
};

export const safeError = (message: string, error?: any) => {
  const errorStr = error ? safeStringify(error) : '';
  console.error(`[DocsUnlocked] ${message}${errorStr ? ' ' + errorStr : ''}`);
};
