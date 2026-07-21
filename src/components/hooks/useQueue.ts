import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueueJob } from '../feature/upload/UploadQueuePanel';
import type { WalletAccount } from '../../../scripts/types';
import { uploadFile } from '../../../scripts/upload';
import {
  ensureVaultUnlocked,
  isVaultUnlocked,
  countKeyEncodings,
} from '../../../scripts/vault';
import { listAllFiles } from '../../../scripts/library-store';

export type StatusMsg = { msg: string; kind: 'info' | 'err' | 'ok' } | null;

export function uploadPhaseLabel(rawPhase?: string): string {
  const phase = (rawPhase || '').toLowerCase();
  if (!phase || phase === 'starting' || phase === 'reading' || phase === 'thumbnail') {
    return 'Preparing file';
  }
  if (phase.includes('encrypt') || phase === 'encrypted') {
    return 'Encrypting locally';
  }
  if (phase.includes('sign upload') || phase.includes('upload to shelby')) {
    return 'Uploading encrypted blob';
  }
  if (phase.includes('wrap key') || phase.includes('save library')) {
    return 'Saving library metadata';
  }
  if (phase === 'done') return 'Done';
  return 'Preparing file';
}

export function useQueue(opts: {
  wallet: WalletAccount | null;
  folderId: string | null;
  onStatus: (s: StatusMsg) => void;
  onUploaded: () => void;
  onVaultOk?: () => void;
  onKeyStats?: (s: {
    plain: number;
    wrapped: number;
    plainThumbs: number;
    wrappedThumbs: number;
  }) => void;
}) {
  const { wallet, folderId, onStatus, onUploaded, onVaultOk, onKeyStats } =
    opts;
  const [queue, setQueue] = useState<QueueJob[]>([]);
  const [queueCollapsed, setQueueCollapsed] = useState(false);
  const queueBusy = useRef(false);
  const pumpQueueRef = useRef<(() => Promise<void>) | null>(null);
  const folderIdRef = useRef(folderId);
  folderIdRef.current = folderId;
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  const lastStatusPhaseRef = useRef('');

  const enqueueFiles = useCallback((list: FileList | File[]) => {
    const w = walletRef.current;
    if (!w) return;
    const arr = Array.from(list);
    if (!arr.length) return;
    const jobs: QueueJob[] = arr.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      status: 'queued' as const,
      ratio: 0,
      file,
      folderId: folderIdRef.current,
    }));
    setQueue((q) => [...q, ...jobs]);
    setQueueCollapsed(false);
    onStatus({
      msg: `Queued ${jobs.length} file${jobs.length === 1 ? '' : 's'}`,
      kind: 'info',
    });
    window.setTimeout(() => void pumpQueueRef.current?.(), 0);
  }, [onStatus]);

  // Stable pump using queue state dependency
  useEffect(() => {
    const pump = async () => {
      const w = walletRef.current;
      if (!w || queueBusy.current) return;
      const next = queue.find((j) => j.status === 'queued');
      if (!next) return;

      queueBusy.current = true;
      const controller = new AbortController();
      lastStatusPhaseRef.current = '';
      const initialPhase = uploadPhaseLabel('Starting');
      setQueue((q) =>
        q.map((j) =>
          j.id === next.id
            ? {
                ...j,
                status: 'running',
                phase: initialPhase,
                ratio: 0.02,
                controller,
              }
            : j
        )
      );
      onStatus({ msg: initialPhase, kind: 'info' });
      lastStatusPhaseRef.current = initialPhase;

      try {
        if (!isVaultUnlocked(w.address)) {
          await ensureVaultUnlocked(w);
          onVaultOk?.();
        }
        await uploadFile(next.file, w, next.folderId, {
          signal: controller.signal,
          onProgress: (p) => {
            const phase = uploadPhaseLabel(p.phase);
            setQueue((q) =>
              q.map((j) =>
                j.id === next.id && j.status === 'running'
                  ? { ...j, phase, ratio: p.ratio }
                  : j
              )
            );
            if (phase !== lastStatusPhaseRef.current) {
              onStatus({ msg: phase, kind: 'info' });
              lastStatusPhaseRef.current = phase;
            }
          },
        });
        setQueue((q) =>
          q.map((j) =>
            j.id === next.id
              ? {
                  ...j,
                  status: 'done',
                  phase: 'Done',
                  ratio: 1,
                  controller: undefined,
                }
              : j
          )
        );
        onKeyStats?.(countKeyEncodings(listAllFiles(w.address)));
        onUploaded();
        onStatus({ msg: `Uploaded ${next.name}`, kind: 'ok' });
      } catch (err) {
        const aborted =
          (err instanceof Error && err.name === 'AbortError') ||
          (err instanceof Error && /cancel/i.test(err.message));
        setQueue((q) =>
          q.map((j) =>
            j.id === next.id
              ? {
                  ...j,
                  status: aborted ? 'cancelled' : 'error',
                  error: aborted
                    ? undefined
                    : err instanceof Error
                      ? err.message
                      : String(err),
                  controller: undefined,
                }
              : j
          )
        );
        if (!aborted) {
          onStatus({
            msg:
              'Upload failed: ' +
              (err instanceof Error ? err.message : String(err)),
            kind: 'err',
          });
        }
      } finally {
        queueBusy.current = false;
        window.setTimeout(() => void pumpQueueRef.current?.(), 0);
      }
    };

    pumpQueueRef.current = pump;

    if (queue.some((j) => j.status === 'queued') && !queueBusy.current) {
      void pump();
    }
  }, [queue, onStatus, onUploaded, onVaultOk, onKeyStats]);

  const cancelQueueItem = useCallback((id: string) => {
    setQueue((q) =>
      q.map((j) => {
        if (j.id !== id) return j;
        try {
          j.controller?.abort();
        } catch {
          /* */
        }
        if (j.status === 'queued' || j.status === 'running') {
          return { ...j, status: 'cancelled' };
        }
        return j;
      })
    );
  }, []);

  const retryQueueItem = useCallback((id: string) => {
    setQueue((q) =>
      q.map((j) =>
        j.id === id
          ? {
              ...j,
              status: 'queued',
              error: undefined,
              phase: undefined,
              ratio: 0,
            }
          : j
      )
    );
  }, []);

  const dismissQueueItem = useCallback((id: string) => {
    setQueue((q) => q.filter((j) => j.id !== id));
  }, []);

  const clearDoneQueue = useCallback(() => {
    setQueue((q) =>
      q.filter((j) => j.status === 'queued' || j.status === 'running')
    );
  }, []);

  return {
    queue,
    queueCollapsed,
    setQueueCollapsed,
    enqueueFiles,
    cancelQueueItem,
    retryQueueItem,
    dismissQueueItem,
    clearDoneQueue,
  };
}
