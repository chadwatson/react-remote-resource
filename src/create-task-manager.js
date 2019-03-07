const createTaskManager = () => {
  const tasks = new Map();
  return {
    has: key => tasks.has(key),
    get: key => tasks.get(key),
    run: (key, task) =>
      tasks.get(key) ||
      tasks
        .set(
          key,
          task()
            .then(x => {
              tasks.delete(key);
              return x;
            })
            .catch(error => {
              tasks.delete(key);
              throw error;
            })
        )
        .get(key)
  };
};

export default createTaskManager;
