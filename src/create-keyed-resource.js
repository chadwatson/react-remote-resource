import { curryN } from "ramda";
import createResource from "./create-resource";

const createKeyedResource = curryN(2, (createKey, loader, entriesExpireAfter) =>
  createResource(
    (resourceState = {}, args) => resourceState[createKey(...args)],
    (resourceState = {}, args, data) => ({
      ...resourceState,
      [createKey(...args)]: data
    }),
    loader,
    entriesExpireAfter
  )
);

export default createKeyedResource;
