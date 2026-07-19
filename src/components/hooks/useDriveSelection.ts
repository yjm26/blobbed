import { useCallback, useEffect, useMemo, useState } from 'react';

export function useDriveSelection(visibleIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSelected((prev) => {
      const vis = new Set(visibleIds);
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (vis.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [visibleIds]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(visibleIds));
  }, [visibleIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return {
    selected,
    selectedIds,
    count: selected.size,
    toggle,
    selectAll,
    clear,
    isSelected,
  };
}
