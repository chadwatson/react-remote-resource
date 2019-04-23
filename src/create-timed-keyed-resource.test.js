import React from "react";
import { render, waitForElement } from "react-testing-library";
import { identity } from "ramda";
import useEntry from "./use-entry";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import createTimedKeyedResource from "./create-timed-keyed-resource";

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

describe("createTimedKeyedResource", () => {
  it("creates a resource", async () => {
    const resource = createTimedKeyedResource(10, identity, () =>
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

  it("loads new data after the specified timeout", async () => {
    let count = 0;

    const resource = createTimedKeyedResource(100, identity, () => {
      count += 1;
      return Promise.resolve(count);
    });

    const { getByText, rerender } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} index={0} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("1"));

    rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} index={0} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("1"));

    await delay(100);

    rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} index={0} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("2"));
  });
});
