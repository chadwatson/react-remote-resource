/**
 * Validates that the resource passed in has the following structure:
 *
 * {
 *   getState: `function`,
 *   setState: `function`,
 *   refresh: `function`,
 *   useState: `function`,
 *   subscribe: `function`
 * }
 *
 * @param {object} resource
 */
export const assertResourceShape = resource => {
  expect(typeof resource.id).toBe("string");
  expect(typeof resource.getState).toBe("function");
  expect(typeof resource.setState).toBe("function");
  expect(typeof resource.refresh).toBe("function");
  expect(typeof resource.useState).toBe("function");
  expect(typeof resource.subscribe).toBe("function");
};
