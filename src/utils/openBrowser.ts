import { spawn } from 'node:child_process';

export async function openBrowser(target: string): Promise<void> {
  const platform = process.platform;
  const { command, args } = resolveOpenCommand(platform, target);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', reject);
    child.unref();
    resolve();
  });
}

function resolveOpenCommand(platform: NodeJS.Platform, target: string): { command: string; args: string[] } {
  if (platform === 'darwin') return { command: 'open', args: [target] };
  if (platform === 'win32') return { command: 'cmd', args: ['/c', 'start', '', target] };
  return { command: 'xdg-open', args: [target] };
}
