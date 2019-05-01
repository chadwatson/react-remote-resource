import createResource from "./create-resource";

const createSingleEntryResource = (loader, entriesExpireAfter) =>
  createResource(
    resourceState => resourceState,
    (resourceState, args, data) => data,
    loader,
    state => state !== undefined,
    entriesExpireAfter
  );

export default createSingleEntryResource;
