import { curry } from "ramda";
import createResource from "./create-resource";

const createTimedSingleEntryResource = curry((ms, loader) => {
  let updatedAt = 0;

  return createResource(
    resourceState => resourceState,
    (resourceState, args, data) => {
      updatedAt = Date.now();
      return data;
    },
    entryState =>
      typeof entryState !== "undefined" && updatedAt + ms > Date.now(),
    loader
  );
});

export default createTimedSingleEntryResource;
