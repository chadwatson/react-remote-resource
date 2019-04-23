import { curry } from "ramda";
import createResource from "./create-resource";

const createTimedKeyedResource = curry((ms, createKey, loader) => {
  const updatedAt = new Map();

  return createResource(
    (resourceState = {}, args) => resourceState[createKey(...args)],
    (resourceState = {}, args, data) => {
      const key = createKey(...args);
      updatedAt.set(key, Date.now());
      return {
        ...resourceState,
        [key]: data
      };
    },
    (entryState, args) =>
      entryState !== undefined &&
      updatedAt.get(createKey(...args)) + ms > Date.now(),
    loader
  );
});

export default createTimedKeyedResource;
