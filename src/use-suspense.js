import { useState, useRef, useEffect } from "react";

const useSuspense = fn => {
  const [task, setTask] = useState(null);
  const mounted = useRef(true);

  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  if (task) {
    throw task;
  }

  return () =>
    setTask(
      fn()
        .then(() => {
          if (mounted.current) {
            setTask(null);
          }
        })
        .catch(() => {
          if (mounted.current) {
            setTask(null);
          }
        })
    );
};

export default useSuspense;
