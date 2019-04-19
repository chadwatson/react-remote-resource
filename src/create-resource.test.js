import createResource from "./create-resource";

import { createResourceInputs as createSpies } from "./__mocks__/create-resource-inputs";

// ---------------------------
// Tests
// ---------------------------

describe("createResource", () => {
  it("is a function", () => {
    expect(typeof createResource).toBe("function");
  });

  it("is returns a function when passed a getter", () => {
    const { getter } = createSpies();
    expect(typeof createResource(getter)).toBe("function");
  });

  it("is returns a function when passed a getter and setter", () => {
    const { getter, setter } = createSpies();
    expect(typeof createResource(getter, setter)).toBe("function");
  });

  it("is returns a function when passed a getter, setter, and entryPredicate", () => {
    const { getter, setter, entryPredicate } = createSpies();
    expect(typeof createResource(getter, setter, entryPredicate)).toBe(
      "function"
    );
  });

  it("is returns a resource when passed a getter, setter, entryPredicate, and loader", () => {
    const { getter, setter, entryPredicate, loader } = createSpies();
    const resource = createResource(getter, setter, entryPredicate, loader);
    expect(
      Object.keys(resource).map(key => [key, typeof resource[key]])
    ).toMatchSnapshot();
  });

  it("is returns a resource when passed a getter, setter, entryPredicate, loader, and getInitialState", () => {
    const { getter, setter, entryPredicate, loader } = createSpies();
    const resource = createResource(getter, setter, entryPredicate, loader);
    expect(
      Object.keys(resource).map(key => [key, typeof resource[key]])
    ).toMatchSnapshot();
  });
});

/**

const storageKey = "SYSTEMS";

// const createResource = curryN(4, (..., getInitialState = Promise.reject) => {
//   // ...
// })

const systemsResource = createResource(
  (currentState = {}, [authToken, customerId]) => currentState[customerId],
  (currentState = {}, [authToken, customerId], systems) => ({
    ...currentState,
    [customerId]: systems
  }),
  (currentState = {}, [authToken, customerId]) => typeof currentState[customerId] !== "undefined",
  (authToken, customerId) => fetch(`/v2/customers/${customerId}/control_systems?auth_token=${authToken}`)
);

systemsResource.subscribe(() => {
  localforage.setItem(storageKey, serialize(resource.getState()));
});

const Systems = () => {
  const [systems, setSystems] = useEntry(systemsResource, [authToken, customerId]);
}
 */
