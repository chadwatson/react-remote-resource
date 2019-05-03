import createResource from "../create-resource";

export const createMockResource = ({
  selectState,
  setState,
  loader,
  hasState
}) => {
  const spies = {
    selectState: jest.fn().mockImplementation(selectState),
    setState: jest.fn().mockImplementation(setState),
    loader: jest.fn().mockImplementation(loader)
  };

  return [
    createResource({
      ...spies,
      hasState
    }),
    spies
  ];
};
