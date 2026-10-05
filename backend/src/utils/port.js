import net from 'node:net';
import http from 'node:http';

/** Must match the `service` value reported by GET /api/health. */
const SERVICE_ID = 'anish-enterprises-api';
const PROBE_TIMEOUT_MS = 1500;

/**
 * Try to bind the port the API is about to use. A free port resolves
 * `{ free: true }`; a busy or unusable port resolves with the reason so the
 * caller can print something actionable instead of a raw EADDRINUSE stack.
 */
export const inspectPort = (port) =>
  new Promise((resolve) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', (error) => resolve({ free: false, code: error.code }));
    probe.once('listening', () => probe.close(() => resolve({ free: true })));
    try {
      // Mirror app.listen(), which binds every interface (dual stack :: ).
      probe.listen({ port, host: '::', exclusive: true });
    } catch (error) {
      resolve({ free: false, code: error.code });
    }
  });

/**
 * Ask whoever already holds the port to identify itself. The health route is
 * public, so this needs no credentials, and the reply is only used to decide
 * whether the squatter is a duplicate of this very backend.
 */
const fingerprintOccupant = (port) =>
  new Promise((resolve) => {
    const request = http.get(
      { host: '127.0.0.1', port, path: '/api/health', timeout: PROBE_TIMEOUT_MS },
      (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          try {
            const payload = JSON.parse(body);
            const data = payload?.data ?? {};
            resolve({
              isSameBackend: data.service === SERVICE_ID,
              service: data.service,
              environment: data.environment,
              uptimeSeconds: data.uptimeSeconds,
              database: data.database?.name,
            });
          } catch {
            resolve({ isSameBackend: false });
          }
        });
      },
    );
    request.on('timeout', () => request.destroy());
    request.on('error', () => resolve({ isSameBackend: false }));
  });

/** A port guard failure, so the caller can report it without a stack trace. */
class PortUnavailableError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PortUnavailableError';
    this.code = code;
  }
}

/**
 * Startup guard: fail fast, before MongoDB is touched, when the port is
 * already taken. This keeps a second copy of this backend from ever starting
 * and never kills the process that is already there.
 */
export const assertPortAvailable = async (port) => {
  const { free, code } = await inspectPort(port);
  if (free) return;

  if (code === 'EADDRINUSE') {
    const occupant = await fingerprintOccupant(port);
    if (occupant.isSameBackend) {
      throw new PortUnavailableError(
        `Port ${port} is already serving this backend (${occupant.service}, ` +
          `${occupant.environment}, database "${occupant.database ?? 'unknown'}", ` +
          `up ${Math.round(occupant.uptimeSeconds ?? 0)}s). Refusing to start a second ` +
          `instance. Stop the running one first, then start this process again.`,
        'DUPLICATE_INSTANCE',
      );
    }
    throw new PortUnavailableError(
      `Port ${port} is in use by another program (not this backend). ` +
        `Free the port, or start this backend on another port with PORT=<number>.`,
      'PORT_IN_USE',
    );
  }

  throw new PortUnavailableError(
    `Port ${port} cannot be used (${code}). Set PORT to a different number and try again.`,
    'PORT_UNUSABLE',
  );
};

export default assertPortAvailable;
