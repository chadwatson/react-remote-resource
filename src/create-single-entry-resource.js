import createResource from "./create-resource";

const createSingleEntryResource = loader =>
  createResource(
    resourceState => resourceState,
    (resourceState, args, data) => data,
    entryState => !!entryState,
    loader
  );

export default createSingleEntryResource;
