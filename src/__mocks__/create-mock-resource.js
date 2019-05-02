import createResource from "../create-resource";

export const createMockResource = ({
  selectState,
  setState,
  loader,
  hasState,
  expireAfter
}) => {
  const spies = {
    selectState: jest.fn().mockImplementation(selectState),
    setState: jest.fn().mockImplementation(setState),
    loader: jest.fn().mockImplementation(loader)
  };

  return [
    createResource({
      ...spies,
      hasState,
      expireAfter
    }),
    spies
  ];
};
