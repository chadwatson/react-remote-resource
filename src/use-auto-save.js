import { useRef, useEffect } from "react";

const useAutoSave = (value, save, delay = 1000) => {
  const initialValue = useRef(value);
  const currentValue = useRef(value);
  const timeout = useRef(null);
  currentValue.current = value;

  useEffect(
    () => () => {
      if (timeout.current !== null) {
        save(currentValue.current);
      }
    },
    []
  );

  useEffect(() => {
    if (value !== initialValue.current) {
      timeout.current = setTimeout(() => save(value), delay);

      return () => {
        clearTimeout(timeout.current);
      };
    }
  }, [value]);
};

export default useAutoSave;
