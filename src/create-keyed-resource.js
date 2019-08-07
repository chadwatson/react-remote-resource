import hash from "object-hash";
import createResource from "./create-resource";

const createKeyedResource = (loader, createKey = (...args) => hash(args)) =>
  createResource({
    selectState: (resourceState = {}, args) =>
      resourceState[createKey(...args)],
    setState: (resourceState = {}, args, data) => {
      const key = createKey(...args);
      return {
        ...resourceState,
        [key]: typeof data === "function" ? data(resourceState[key]) : data
      };
    },
    loader
  });

export default createKeyedResource;
