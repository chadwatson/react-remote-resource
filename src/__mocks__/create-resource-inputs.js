export const createResourceInputs = () => ({
  getter: jest.fn().mockImplementation(state => state),
  setter: jest.fn().mockImplementation((_, __, newState) => newState),
  entryPredicate: jest.fn().mockImplementation(state => !!state),
  loader: jest.fn().mockImplementation(value => Promise.resolve(value))
});
