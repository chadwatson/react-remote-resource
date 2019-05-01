import createResource from "../create-resource";

export const createMockResource = (
  selectState,
  setState,
  loader,
  hasState,
  entriesExpireAfter
) => {
  const spies = {
    selectState: jest.fn().mockImplementation(selectState),
    setState: jest.fn().mockImplementation(setState),
    loader: jest.fn().mockImplementation(loader)
  };

  return [
    createResource(
      spies.selectState,
      spies.setState,
      spies.loader,
      hasState,
      entriesExpireAfter
    ),
    spies
  ];
};
