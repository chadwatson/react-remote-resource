import React from "react";
import { render, waitForElement } from "react-testing-library";
import useEntry from "./use-entry";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import createSingleEntryResource from "./create-single-entry-resource";

// ---------------------------
// Mocks
// ---------------------------

const MockResourceConsumer = ({ resource }) => {
  const [entry] = useEntry(resource);

  return entry;
};

// ---------------------------
// Tests
// ---------------------------

describe("createSingleEntryResource", () => {
  it("creates a resource", async () => {
    const resource = createSingleEntryResource(() =>
      Promise.resolve("resolved")
    );

    const { getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("resolved"));
  });

  it("does not run the load function if entry is defined", async () => {
    const resource = createSingleEntryResource(() =>
      Promise.resolve("resolved")
    );

    resource.setState("other state");

    const { container, getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} />
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
