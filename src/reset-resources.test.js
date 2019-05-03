import resetResources from "./reset-resources.js";
import createSimpleResource from "./create-simple-resource";

describe("resetResources", () => {
  it("resets the state for the given resources", () => {
    const resourceA = createSimpleResource(() => Promise.resolve("resourceA"));
    const resourceB = createSimpleResource(() => Promise.resolve("resourceB"));
    const resourceC = createSimpleResource(() => Promise.resolve("resourceC"));

    resourceA.setState("A");
    resourceB.setState("B");
    resourceC.setState("C");

    expect(resourceA.getState()).toBe("A");
    expect(resourceB.getState()).toBe("B");
    expect(resourceC.getState()).toBe("C");

    resetResources([resourceA, resourceB]);

    expect(resourceA.getState()).toBe(undefined);
    expect(resourceB.getState()).toBe(undefined);
    expect(resourceC.getState()).toBe("C");
  });
});
