import createResource from "../create-resource";

export const createMockResource = (
  getter,
  setter,
  loader,
  entriesExpireAfter
) => {
  const spies = {
    getter: jest.fn().mockImplementation(getter),
    setter: jest.fn().mockImplementation(setter),
    loader: jest.fn().mockImplementation(loader)
  };

  return [
    createResource(
      spies.getter,
      spies.setter,
      spies.loader,
      entriesExpireAfter
    ),
    spies
  ];
};
