import { useEffect, useRef, useState } from 'react';

interface ConfigDiffState {
  changedKeys: Set<string>;
  newKeys: Set<string>;
  removedKeys: Set<string>;
}

function flattenObject(
  value: unknown,
  path: string = '',
  target: Map<string, unknown> = new Map<string, unknown>()
): Map<string, unknown> {
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenObject(item, `${path}[${index}]`, target);
    });
    return target;
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    entries.forEach(([key, nested]) => {
      const nextPath = path ? `${path}.${key}` : key;
      flattenObject(nested, nextPath, target);
    });
    return target;
  }

  target.set(path, value);
  return target;
}

export function useConfigDiff(config: Record<string, unknown>, holdMs: number = 1500): ConfigDiffState {
  const previousMapRef = useRef<Map<string, unknown> | null>(null);
  const [diffState, setDiffState] = useState<ConfigDiffState>({
    changedKeys: new Set(),
    newKeys: new Set(),
    removedKeys: new Set(),
  });

  useEffect(() => {
    const currentMap = flattenObject(config);
    const previousMap = previousMapRef.current;
    if (!previousMap) {
      previousMapRef.current = currentMap;
      return;
    }

    const changedKeys = new Set<string>();
    const newKeys = new Set<string>();
    const removedKeys = new Set<string>();

    currentMap.forEach((value, key) => {
      if (!previousMap.has(key)) {
        newKeys.add(key);
        return;
      }
      const previousValue = previousMap.get(key);
      if (JSON.stringify(previousValue) !== JSON.stringify(value)) {
        changedKeys.add(key);
      }
    });

    previousMap.forEach((_value, key) => {
      if (!currentMap.has(key)) {
        removedKeys.add(key);
      }
    });

    if (changedKeys.size > 0 || newKeys.size > 0 || removedKeys.size > 0) {
      setDiffState({ changedKeys, newKeys, removedKeys });
      const timer = window.setTimeout(() => {
        setDiffState({
          changedKeys: new Set(),
          newKeys: new Set(),
          removedKeys: new Set(),
        });
      }, holdMs);

      previousMapRef.current = currentMap;
      return () => window.clearTimeout(timer);
    }

    previousMapRef.current = currentMap;
    return undefined;
  }, [config, holdMs]);

  return diffState;
}

