import { useEffect, useRef, useState } from 'react';
import type { FileMetadata, WalletAccount } from '../../../scripts/types';
import { openThumb } from '../../../scripts/vault';
import { fileToShareItemAsync } from '../../../scripts/share';
import { isImageMime, previewObjectUrl } from '../../../scripts/preview';

/**
 * Decrypt thumbs into a Map for grid display.
 * Re-runs when files list or tick changes.
 */
export function useThumbs(
  wallet: WalletAccount | null,
  files: FileMetadata[],
  tick: number
) {
  const thumbs = useRef(new Map<string, string>());
  const [, setThumbTick] = useState(0);

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;

    (async () => {
      for (const f of files) {
        if (cancelled) return;
        if (thumbs.current.has(f.id)) continue;

        if (f.thumbDataUrl) {
          try {
            const url = await openThumb(f.thumbDataUrl, wallet);
            if (cancelled) return;
            if (url) {
              thumbs.current.set(f.id, url);
              setThumbTick((x) => x + 1);
              continue;
            }
          } catch {
            /* */
          }
        }

        if (!isImageMime(f.mimeType, f.originalName)) continue;
        try {
          const item = await fileToShareItemAsync(f, wallet);
          const url = await previewObjectUrl(item);
          if (cancelled) return;
          thumbs.current.set(f.id, url);
          setThumbTick((x) => x + 1);
        } catch {
          /* */
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [files, wallet, tick]);

  return { thumbs: thumbs.current, thumbTick: 0 as number };
}
