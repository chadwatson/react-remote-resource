import createResource from "./create-resource";

const createSingleEntryResource = (loader, entriesExpireAfter) =>
  createResource(
    resourceState => resourceState,
    (resourceState, args, data) => data,
    loader,
    entriesExpireAfter
  );

export default createSingleEntryResource;
