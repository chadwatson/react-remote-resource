import React from "react";
import { render, waitForElement } from "react-testing-library";
import { identity } from "ramda";
import useEntry from "./use-entry";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import createKeyedResource from "./create-keyed-resource";

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
    const resource = createKeyedResource(identity, () =>
      Promise.resolve("resolved")
    );

    const { getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} index={0} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("resolved"));
  });

  it("does not run the load function if entry is defined", async () => {
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
