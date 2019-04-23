import createResource from "../create-resource";

export const createMockResource = (getter, setter, entryPredicate, loader) => {
  const spies = {
    getter: jest.fn().mockImplementation(getter),
    setter: jest.fn().mockImplementation(setter),
    entryPredicate: jest.fn().mockImplementation(entryPredicate),
    loader: jest.fn().mockImplementation(loader)
  };

  return [
    createResource(
      spies.getter,
      spies.setter,
      spies.entryPredicate,
      spies.loader
    ),
    spies
  ];
};
