import hash from "object-hash";
import createResource from "./create-resource";

const createKeyedResource = (loader, createKey = (...args) => hash(args)) =>
  createResource({
    selectState: (resourceState = {}, args) =>
      resourceState[createKey(...args)],
    setState: (resourceState = {}, args, data) => ({
      ...resourceState,
      [createKey(...args)]: data
    }),
    loader
  });

export default createKeyedResource;
