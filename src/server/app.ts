/** One Express port serving the built client and Socket.IO. */
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { Server } from 'socket.io';
import { RuleError, type Action } from '../rules/index.ts';
import { Table } from './table.ts';

export interface ServerOptions {
  port?: number;
  /** Folder of the built client to serve, if any. */
  clientDir?: string;
  seed?: number;
}

export interface RunningServer {
  url: string;
  port: number;
  table: Table;
  close(): Promise<void>;
}

function describe(err: unknown): string {
  if (err instanceof RuleError) return err.message;
  console.error(err);
  return 'Something went wrong on the server';
}

export async function startServer(options: ServerOptions = {}): Promise<RunningServer> {
  const app = express();
  if (options.clientDir) app.use(express.static(options.clientDir));
  const http = createServer(app);
  const io = new Server(http);
  const table = new Table(undefined, options.seed);

  table.onChange((events) => {
    for (const socket of io.sockets.sockets.values()) {
      socket.emit('view', table.view(socket.data.playerId, events));
    }
  });

  io.on('connection', (socket) => {
    const token: unknown = socket.handshake.auth.token;
    socket.data.playerId = table.playerFor(typeof token === 'string' && token ? token : socket.id);
    socket.emit('view', table.view(socket.data.playerId));

    socket.on('action', (action: Action, ack: (res: { ok: boolean; error?: string }) => void) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      try {
        table.act(socket.data.playerId, action);
        reply({ ok: true });
      } catch (err) {
        reply({ ok: false, error: describe(err) });
      }
    });
  });

  await new Promise<void>((resolve) => http.listen(options.port ?? 0, resolve));
  const port = (http.address() as AddressInfo).port;
  return {
    url: `http://localhost:${port}`,
    port,
    table,
    close: () =>
      new Promise((resolve) => {
        io.close(() => resolve());
      }),
  };
}
