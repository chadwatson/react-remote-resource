import React from "react";
import { render, waitForElement } from "react-testing-library";
import { identity } from "ramda";
import useEntry from "./use-entry";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import persistResource from "./persist-resource";
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

describe("persistResource", () => {
  it("loads the initial state into the resource", async () => {
    const getInitialState = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ 0: "initial" }));
    const persist = jest.fn();

    const resource = persistResource(
      getInitialState,
      persist,
      createKeyedResource(identity, () => Promise.resolve("load"))
    );

    const { getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} index={0} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("initial"));
  });

  it("runs the persist function when the state updates", async () => {
    const getInitialState = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ 0: "initial" }));
    const persist = jest.fn();

    const resource = persistResource(
      getInitialState,
      persist,
      createKeyedResource(identity, () => Promise.resolve("load"))
    );

    const { getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} index={0} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("initial"));

    resource.setState({ 0: "setState" });
    await waitForElement(() => getByText("setState"));

    expect(persist).toHaveBeenNthCalledWith(1, { 0: "setState" });
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("does not run the getInitialState or persist functions when state already exists", async () => {
    const getInitialState = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ 0: "initial" }));
    const persist = jest.fn();

    const resource = persistResource(
      getInitialState,
      persist,
      createKeyedResource(identity, () => Promise.resolve("load"))
    );

    resource.setState({ 0: "manual" });

    const { getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <MockResourceConsumer resource={resource} index={0} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("manual"));
    expect(persist).not.toHaveBeenCalled();
  });
});
