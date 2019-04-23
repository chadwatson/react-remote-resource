import createResource from "../create-resource";
import createSingleEntryResource from "../create-single-entry-resource";

export const createMockResource = (
  getter,
  setter,
  entryPredicate,
  loader,
  getInitialValue
) => {
  const spies = {
    getter: jest.fn().mockImplementation(getter),
    setter: jest.fn().mockImplementation(setter),
    entryPredicate: jest.fn().mockImplementation(entryPredicate),
    loader: jest.fn().mockImplementation(loader),
    getInitialValue:
      getInitialValue && jest.fn().mockImplementation(getInitialValue)
  };

  return [
    createResource(
      spies.getter,
      spies.setter,
      spies.entryPredicate,
      spies.loader,
      spies.getInitialValue
    ),
    spies
  ];
};

export const createMockSingleEntryResource = (loader, getInitialValue) => {
  const spies = {
    loader: jest.fn().mockImplementation(loader),
    getInitialValue:
      getInitialValue && jest.fn().mockImplementation(getInitialValue)
  };

  return [
    createSingleEntryResource(spies.loader, spies.getInitialValue),
    spies
  ];
};
