import { curryN } from "ramda";
import createResource from "./create-resource";

const createKeyedResource = curryN(2, (createKey, loader, expireAfter) =>
  createResource({
    selectState: (resourceState = {}, args) =>
      resourceState[createKey(...args)],
    setState: (resourceState = {}, args, data) => ({
      ...resourceState,
      [createKey(...args)]: data
    }),
    loader,
    expireAfter
  })
);

export default createKeyedResource;
