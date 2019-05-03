import React from "react";
import { render, waitForElement, fireEvent } from "react-testing-library";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import { createMockResource } from "./__mocks__/create-mock-resource";

// ---------------------------
// Mocks
// ---------------------------

const MockResourceConsumer = ({ resource }) => {
  const [entry] = resource.useState();

  return entry;
};

// ---------------------------
// Tests
// ---------------------------

describe("RemoteResourceBoundary", () => {
  it("remote resource boundary shows the fallback when loading", async () => {
    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => Promise.resolve("resolved")
    });

    const { getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
  });

  it("remote resource boundary shows the error when rejected", async () => {
    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => Promise.reject("rejected")
    });

    const { getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={({ error }) => <p>{error}</p>}
      >
        <MockResourceConsumer resource={resource} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("rejected"));
  });

  it("remote resource boundary calls on load error when promise rejected", async () => {
    const spy = jest.fn();

    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => Promise.reject("rejected")
    });

    const { getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={({ error }) => <p>{error}</p>}
        onLoadError={spy}
      >
        <MockResourceConsumer resource={resource} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("rejected"));
    expect(spy).toHaveBeenCalledWith("rejected");
  });

  it("remote resource boundary retry function works as desired", async () => {
    let callCount = 0;

    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => {
        if (callCount === 0) {
          callCount++;
          return Promise.reject("rejected");
        }

        return Promise.resolve("resolved");
      }
    });

    const { getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={({ error, retry }) => (
          <p>
            {error}
            <button onClick={retry}>retry</button>
          </p>
        )}
      >
        <MockResourceConsumer resource={resource} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("rejected"));

    const retryButton = await waitForElement(() => getByText("retry"));
    fireEvent.click(retryButton);

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("resolved"));
  });
});
