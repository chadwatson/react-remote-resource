import { useState } from "react";

const useSuspense = fn => {
  const [task, setTask] = useState(null);

  if (task) {
    throw task;
  }

  return () =>
    setTask(
      fn()
        .then(() => {
          setTask(null);
        })
        .catch(() => {
          setTask(null);
        })
    );
};

export default useSuspense;
