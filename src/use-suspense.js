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
      fn().finally(() => {
        /* istanbul ignore else */
        if (mounted.current) {
          setTask(null);
        }
      })
    );
};

export default useSuspense;
