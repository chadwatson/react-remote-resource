import { useEffect } from "react";

const useAutoSave = (value, save, delay = 1000) => {
  useEffect(() => {
    const timeout = setTimeout(() => save(value), delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [value]);

  useEffect(
    () => () => {
      if (value) {
        save(value);
      }
    },
    []
  );
};

export default useAutoSave;
