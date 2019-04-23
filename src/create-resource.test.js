import createResource from "./create-resource";
import { createMockResource } from "./__mocks__/create-mock-resource";
import { assertResourceShape } from "./__mocks__/assert-resource-shape";

const getter = jest.fn();
const setter = jest.fn();
const entryPredicate = jest.fn();
const loader = jest.fn();

// ---------------------------
// Tests
// ---------------------------

describe("createResource", () => {
  // ---------------------------
  // Resource Structure Tests
  // ---------------------------

  it("is a function", () => {
    expect(typeof createResource).toBe("function");
  });

  it("is returns a function when passed a getter", () => {
    expect(typeof createResource(getter)).toBe("function");
  });

  it("is returns a function when passed a getter and setter", () => {
    expect(typeof createResource(getter, setter)).toBe("function");
  });

  it("is returns a function when passed a getter, setter, and entryPredicate", () => {
    expect(typeof createResource(getter, setter, entryPredicate)).toBe(
      "function"
    );
  });

  it("is returns a resource when passed a getter, setter, entryPredicate, and loader", () => {
    assertResourceShape(createResource(getter, setter, entryPredicate, loader));
  });

  // ---------------------------
  // Usage Tests
  // ---------------------------

  it("can setState and getState", () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      () => Promise.resolve("resolved")
    );

    expect(resource.getState()).toBe(undefined);
    resource.setState("new resource state");
    expect(resource.getState()).toBe("new resource state");
  });

  it("can setState using a function", () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      () => Promise.resolve("resolved")
    );

    resource.setState("initial state");

    expect(resource.getState()).toBe("initial state");
    resource.setState(value => value.toUpperCase());
    expect(resource.getState()).toBe("INITIAL STATE");
  });

  it("can refresh", async () => {
    const [resource, spies] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      () => Promise.resolve("resolved")
    );

    expect(resource.getState()).toBe(undefined);
    await resource.refresh();
    expect(spies.loader).toHaveBeenCalled();
    expect(resource.getState()).toBe("resolved");
  });

  it("can subscribe", async () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      () => Promise.resolve("resolved")
    );

    const spy = jest.fn().mockImplementation(() => resource.getState());

    resource.subscribe(spy);

    await resource.refresh();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveLastReturnedWith("resolved");

    resource.setState("new resource state");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveLastReturnedWith("new resource state");
  });
});
