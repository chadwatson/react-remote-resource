import { equals } from "ramda";
import createResource from "./create-resource";

const createSimpleResource = loader => {
  let currentArgs = [];

  return createResource({
    loader,
    selectState: state => state,
    setState: (_, args = [], data) => {
      currentArgs = args;
      return data;
    },
    hasState: (state, args = []) =>
      state !== undefined && equals(args, currentArgs)
  });
};

export default createSimpleResource;
