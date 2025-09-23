// CSS styles for browser console
const CONSOLE_STYLES = {
  FILE: "color: #4a9eff; font-size: 10px; font-weight: 600; padding: 2px 6px; background: rgba(74, 158, 255, 0.1); border-radius: 4px; border-left: 3px solid #4a9eff;",
  DEBUG:
    "color: #9ca3af; font-size: 10px; font-weight: 500; background: rgba(156, 163, 175, 0.05); padding: 1px 4px; border-radius: 3px;",
  INFO: "color: #10b981; font-size: 10px; font-weight: 500; background: rgba(16, 185, 129, 0.1); padding: 2px 6px; border-radius: 4px;",
  WARN: "color: #f59e0b; font-size: 10px; font-weight: 600; background: rgba(245, 158, 11, 0.1); padding: 2px 6px; border-radius: 4px; border-left: 3px solid #f59e0b;",
  ERROR:
    "color: #ef4444; font-size: 10px; font-weight: 700; background: rgba(239, 68, 68, 0.1); padding: 2px 6px; border-radius: 4px; border-left: 3px solid #ef4444;",
} as const;

type LogType = "log" | "debug" | "info" | "warn" | "error";

/**
 * Global Logger utility for consistent logging across the application
 */
export const Logger = {
  _enabled: true, // Logging is enabled by default

  _getFormattedCallSite(logType: LogType = "log"): {
    prefix: string;
    style?: string;
  } {
    try {
      const err = new Error();
      if (!err.stack) {
        return { prefix: "" };
      }
      const stackLines = err.stack.split("\n");
      if (stackLines.length > 3) {
        const callerLine = stackLines[3];
        const match = callerLine.match(
          /\((.*?):(\d+):\d+\)|at (.*?):(\d+):\d+$/
        );
        if (match) {
          const filePath = match[1] || match[3];
          const lineNumber = match[2] || match[4];
          const fileName = filePath.split(/[\\/]/).pop();
          const callSite = `[${fileName}:${lineNumber}]`;

          let style: string;
          switch (logType) {
            case "debug":
              style = CONSOLE_STYLES.DEBUG;
              break;
            case "info":
              style = CONSOLE_STYLES.INFO;
              break;
            case "warn":
              style = CONSOLE_STYLES.WARN;
              break;
            case "error":
              style = CONSOLE_STYLES.ERROR;
              break;
            default:
              style = CONSOLE_STYLES.FILE;
          }

          return { prefix: `%c${callSite}`, style };
        }
      }
    } catch (e) {
      // Silently ignore
    }
    return { prefix: "" };
  },

  /**
   * Enables logging.
   */
  enable(): void {
    this._enabled = true;
  },

  /**
   * Disables logging.
   */
  disable(): void {
    this._enabled = false;
  },

  /**
   * Checks if logging is currently enabled.
   * @returns True if logging is enabled, false otherwise.
   */
  isEnabled(): boolean {
    return this._enabled;
  },

  /**
   * Logs messages if logging is enabled.
   * @param args Arguments to log.
   */
  log(...args: any[]): void {
    if (this._enabled) {
      const { prefix, style } = this._getFormattedCallSite("log");
      if (style) {
        // Browser environment
        console.log(prefix, style, ...args);
      } else {
        // Node.js/terminal environment
        console.log(prefix, ...args);
      }
    }
  },

  /**
   * Logs warning messages if logging is enabled.
   * @param args Arguments to log as a warning.
   */
  warn(...args: any[]): void {
    if (this._enabled) {
      const { prefix, style } = this._getFormattedCallSite("warn");
      if (style) {
        console.warn(prefix, style, ...args);
      } else {
        console.warn(prefix, ...args);
      }
    }
  },

  /**
   * Logs error messages if logging is enabled.
   * @param args Arguments to log as an error.
   */
  error(...args: any[]): void {
    if (this._enabled) {
      const { prefix, style } = this._getFormattedCallSite("error");
      if (style) {
        console.error(prefix, style, ...args);
      } else {
        console.error(prefix, ...args);
      }
    }
  },

  /**
   * Logs informational messages if logging is enabled.
   * @param args Arguments to log as info.
   */
  info(...args: any[]): void {
    if (this._enabled) {
      const { prefix, style } = this._getFormattedCallSite("info");
      if (style) {
        console.info(prefix, style, ...args);
      } else {
        console.info(prefix, ...args);
      }
    }
  },

  /**
   * Logs debug messages if logging is enabled.
   * Falls back to Logger.log with a [DEBUG] prefix if console.debug is not available.
   * @param args Arguments to log as debug.
   */
  debug(...args: any[]): void {
    if (this._enabled) {
      const { prefix, style } = this._getFormattedCallSite("debug");
      const debugPrefix = "[DEBUG]";
      if (typeof console.debug === "function") {
        if (style) {
          console.debug(prefix, style, debugPrefix, ...args);
        } else {
          console.debug(prefix, debugPrefix, ...args);
        }
      } else {
        if (style) {
          console.log(prefix, style, debugPrefix, ...args);
        } else {
          console.log(prefix, debugPrefix, ...args);
        }
      }
    }
  },
};
