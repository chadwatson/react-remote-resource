import React from "react";
import { render, waitForElement } from "react-testing-library";
import useEntry from "./use-entry";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import createTimedSingleEntryResource from "./create-timed-single-entry-resource";

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

describe("createTimedSingleEntryResource", () => {
  it("creates a resource", async () => {
    const resource = createTimedSingleEntryResource(10, () =>
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

  it("loads new data after the specified timeout", async () => {
    let count = 0;

    const resource = createTimedSingleEntryResource(100, () => {
      count += 1;
      return Promise.resolve(count);
    });

    const { getByText, rerender } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("1"));

    rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("1"));

    await delay(100);

    rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("2"));
  });
});
