import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const port = Number(process.env.OPERATIONS_PORT || 3200);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('OPERATIONS_PORT must be between 1024 and 65535.');
const child = spawn(
  process.execPath,
  [
    require.resolve('next/dist/bin/next'),
    'dev',
    '--webpack',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      APP_MODE: 'demo',
      APP_ORIGIN: `http://127.0.0.1:${port}`,
      DEMO_DATA_DIR: path.join(process.cwd(), '.local', 'operations-preview'),
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
);
child.on('exit', (code) => {
  process.exitCode = code || 0;
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
