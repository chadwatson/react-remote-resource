import createResource from "./create-resource";

const createSingleEntryResource = loader =>
  createResource(
    resourceState => resourceState,
    (resourceState, args, data) => data,
    entryState => typeof entryState !== "undefined",
    loader
  );

export default createSingleEntryResource;
