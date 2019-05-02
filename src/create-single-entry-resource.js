import createResource from "./create-resource";

const createSingleEntryResource = (loader, expireAfter) =>
  createResource({
    selectState: resourceState => resourceState,
    setState: (resourceState, args, data) => data,
    loader,
    expireAfter
  });

export default createSingleEntryResource;
