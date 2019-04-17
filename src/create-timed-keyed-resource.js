import { curry } from "ramda";
import createResource from "./create-resource";

const createTimedKeyedResource = curry((ms, loader) => {
  const updatedAt = new Map();

  return createResource(
    (resourceState = {}, [key]) => resourceState[key],
    (resourceState = {}, [key], data) => {
      updatedAt.set(key, Date.now());
      return {
        ...resourceState,
        [key]: data
      };
    },
    (entryState, [key]) => !!entryState && updatedAt.get(key) + ms < Date.now(),
    loader
  );
});

export default createTimedKeyedResource;
