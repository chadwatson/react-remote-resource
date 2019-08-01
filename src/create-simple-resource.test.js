import React from "react";
import { render, waitForElement } from "react-testing-library";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import createSimpleResource from "./create-simple-resource";
import { assertResourceShape } from "./__mocks__/assert-resource-shape";

// ---------------------------
// Tests
// ---------------------------

describe("createSimpleResource", () => {
  it("creates a resource", async () => {
    assertResourceShape(
      createSimpleResource(() => Promise.resolve("resolved"))
    );
  });

  it("correctly shapes the resource to a single entry", async () => {
    const resource = createSimpleResource(() => Promise.resolve("resolved"));

    const Example = () => {
      const [entry] = resource.useState();

      return entry;
    };

    const { getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("resolved"));
    expect(resource.getState()).toBe("resolved");
  });

  it("does not run the load function if the entry is already defined and no arguments are provided", async () => {
    const resource = createSimpleResource(() => Promise.resolve("resolved"));

    const Example = () => {
      const [entry] = resource.useState();
      return entry;
    };

    resource.setState("other state");

    const { container, getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    const stopObservation = observeElement(() => {
      expect(container).not.toHaveTextContent("resolved");
      expect(container).not.toHaveTextContent("Loading...");
    }, container);

    await waitForElement(() => getByText("other state"));

    stopObservation();
  });

  it("does not run the load function if the entry is already defined and arguments are provided", async () => {
    const resource = createSimpleResource(() => Promise.resolve("resolved"));

    const Example = () => {
      const [entry] = resource.useState("a", "b", "c");
      return entry;
    };

    resource.setState("other state");

    const { container, getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    const stopObservation = observeElement(() => {
      expect(container).not.toHaveTextContent("resolved");
      expect(container).not.toHaveTextContent("Loading...");
    }, container);

    await waitForElement(() => getByText("other state"));

    stopObservation();
  });
});
