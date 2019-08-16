import React from "react";
import { render, waitForElement, fireEvent } from "@testing-library/react";
import createSimpleResource from "./create-simple-resource";
import batchSetState from "./batch-set-state";
import RemoteResourceBoundary from "./RemoteResourceBoundary";

describe("batchSetState", () => {
  it("is a function", () => {
    expect(typeof batchSetState).toBe("function");
  });

  it("sets the state of all resources to the corresponding values", () => {
    const resourceA = createSimpleResource(() => Promise.resolve("a"));
    const resourceB = createSimpleResource(() => Promise.resolve("b"));
    const resourceC = createSimpleResource(() => Promise.resolve("c"));

    resourceA.setState("a");
    resourceB.setState("b");
    resourceC.setState("c");

    batchSetState([resourceA, "A"], [resourceB, "B"], [resourceC, "C"]);

    expect(resourceA.getState()).toBe("A");
    expect(resourceB.getState()).toBe("B");
    expect(resourceC.getState()).toBe("C");
  });

  it("maps the current state for given resources to the given updater functions", () => {
    const resourceA = createSimpleResource(() => Promise.resolve("a"));
    const resourceB = createSimpleResource(() => Promise.resolve("b"));
    const resourceC = createSimpleResource(() => Promise.resolve("c"));

    resourceA.setState("a");
    resourceB.setState("b");
    resourceC.setState("c");

    batchSetState(
      [resourceA, state => state.toUpperCase()],
      [resourceB, state => state.toUpperCase()],
      [resourceC, state => state.toUpperCase()]
    );

    expect(resourceA.getState()).toBe("A");
    expect(resourceB.getState()).toBe("B");
    expect(resourceC.getState()).toBe("C");
  });
});
