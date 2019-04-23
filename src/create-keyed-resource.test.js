import React from "react";
import { render, waitForElement, wait } from "react-testing-library";
import { identity } from "ramda";
import useEntry from "./use-entry";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import createKeyedResource from "./create-keyed-resource";
import { assertResourceShape } from "./__mocks__/assert-resource-shape";

// ---------------------------
// Mocks
// ---------------------------

const MockResourceConsumer = ({ resource, index }) => {
  const [entry] = useEntry(resource, [index]);

  return entry;
};

// ---------------------------
// Tests
// ---------------------------

describe("createKeyedResource", () => {
  it("creates a resource", async () => {
    assertResourceShape(
      createKeyedResource(identity, () => Promise.resolve("resolved"))
    );
  });

  it("correctly shapes the resource state by key", async () => {
    const resource = createKeyedResource(identity, () =>
      Promise.resolve("resolved")
    );

    const { container } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} index={0} />
        <MockResourceConsumer resource={resource} index={1} />
        <MockResourceConsumer resource={resource} index={2} />
      </RemoteResourceBoundary>
    );

    await wait(() => expect(container).toHaveTextContent("resolved"));

    expect(resource.getState()).toEqual({
      0: "resolved",
      1: "resolved",
      2: "resolved"
    });
  });

  it("does not run the load function if an entry is already defined", async () => {
    const resource = createKeyedResource(identity, () =>
      Promise.resolve("resolved")
    );

    resource.setState({ 0: "other state" });

    const { container, getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} index={0} />
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
