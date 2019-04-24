import React from "react";
import { render, waitForElement } from "react-testing-library";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import createTimedSingleEntryResource from "./create-timed-single-entry-resource";

// ---------------------------
// Tests
// ---------------------------

describe("createTimedSingleEntryResource", () => {
  it("creates a resource", async () => {
    const resource = createTimedSingleEntryResource(10, () =>
      Promise.resolve("resolved")
    );

    const Example = () => {
      const [entry] = resource.useEntry();

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
  });

  it("loads new data after the specified timeout", async () => {
    let count = 0;

    const resource = createTimedSingleEntryResource(100, () => {
      count += 1;
      return Promise.resolve(count);
    });

    const Example = () => {
      const [entry] = resource.useEntry();

      return entry;
    };

    const { getByText, rerender } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("1"));

    rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("1"));

    await delay(100);

    rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("2"));
  });
});
