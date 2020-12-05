import {useRef, useEffect, useCallback} from 'react';

/**
 * useMountedState
 */
export function useMountedState(): () => boolean {
  const mountedRef = useRef<boolean>(false);

  const getMounted = useCallback(() => mountedRef.current, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  });

  return getMounted;
}
