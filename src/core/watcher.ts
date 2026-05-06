import chokidar from 'chokidar';

const DEBOUNCE_MS = 500;

export interface Watcher {
  close: () => Promise<void>;
}

export async function startWatch(
  watchDir: string,
  onChange: () => void,
): Promise<Watcher> {
  // debounceTimer is scoped inside startWatch — each instance has its own
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const watcher = chokidar.watch(watchDir, {
    ignoreInitial: true,
    depth: 0,
    awaitWriteFinish: {
      stabilityThreshold: 200,
      pollInterval: 100,
    },
  });

  const debouncedOnChange = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      onChange();
      debounceTimer = null;
    }, DEBOUNCE_MS);
  };

  watcher.on('add', debouncedOnChange);
  watcher.on('change', debouncedOnChange);
  watcher.on('unlink', debouncedOnChange);

  return {
    close: async () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      await watcher.close();
    },
  };
}
