import {useState, useEffect, useRef} from 'react';

export default function useDebounce(value: string, delay: number = 600) {
  const [currentValue, setCurrentValue] = useState(value);
  const interval = useRef<NodeJS.Timeout | null>(null);

  const clean = () => {
    if (interval.current !== null) {
      clearInterval(interval.current);
    }
  };

  useEffect(() => {
    interval.current = setTimeout(() => {
      setCurrentValue(value);
    }, delay);
    return clean;
  }, [value, delay]);

  useEffect(() => clean, []);

  return currentValue;
}
