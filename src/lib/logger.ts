type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };

  if (level === 'ERROR') {
    console.error(formatLog(entry));
  } else if (level === 'WARN') {
    console.warn(formatLog(entry));
  } else {
    console.log(formatLog(entry));
  }
}

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    log('INFO', message, context);
  },
  warn(message: string, context?: Record<string, unknown>) {
    log('WARN', message, context);
  },
  error(message: string, context?: Record<string, unknown>) {
    log('ERROR', message, context);
  },
  audit(message: string, context?: Record<string, unknown>) {
    log('AUDIT', message, context);
  },
};
