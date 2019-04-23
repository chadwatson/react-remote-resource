import { curry } from "ramda";
import createResource from "./create-resource";

const createKeyedResource = curry((createKey, loader) =>
  createResource(
    (resourceState = {}, args) => resourceState[createKey(...args)],
    (resourceState = {}, args, data) => ({
      ...resourceState,
      [createKey(...args)]: data
    }),
    entryState => entryState !== undefined,
    loader
  )
);

export default createKeyedResource;
