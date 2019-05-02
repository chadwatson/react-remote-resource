import { curryN } from "ramda";
import createResource from "./create-resource";

const createKeyedResource = curryN(1, (createKey, loader) =>
  createResource({
    selectState: (resourceState = {}, args) =>
      resourceState[createKey(...args)],
    setState: (resourceState = {}, args, data) => ({
      ...resourceState,
      [createKey(...args)]: data
    }),
    loader
  })
);

export default createKeyedResource;
