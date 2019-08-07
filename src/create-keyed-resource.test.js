import React from "react";
import {
  act,
  render,
  waitForElement,
  wait,
  fireEvent
} from "@testing-library/react";
import hash from "object-hash";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import createKeyedResource from "./create-keyed-resource";
import { assertResourceShape } from "./__mocks__/assert-resource-shape";

// ---------------------------
// Tests
// ---------------------------

describe("createKeyedResource", () => {
  it("creates a resource", async () => {
    assertResourceShape(createKeyedResource(() => Promise.resolve("resolved")));
  });

  it("correctly shapes the resource state by key", async () => {
    const resource = createKeyedResource(
      () => Promise.resolve("resolved"),
      index => index
    );

    const Example = ({ index }) => {
      const [entry] = resource.useState(index);
      return entry;
    };

    const { container } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example index={0} />
        <Example index={1} />
        <Example index={2} />
      </RemoteResourceBoundary>
    );

    await wait(() => expect(container).toHaveTextContent("resolved"));

    expect(resource.getState()).toEqual({
      0: "resolved",
      1: "resolved",
      2: "resolved"
    });
  });

  it("automatically sets the key in the state if a createKey function is not provided", async () => {
    const resource = createKeyedResource(() => Promise.resolve("resolved"));

    const Example = ({ index }) => {
      const [entry] = resource.useState(index);
      return entry;
    };

    const { container } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example index={0} />
        <Example index={1} />
        <Example index={2} />
      </RemoteResourceBoundary>
    );

    await wait(() => expect(container).toHaveTextContent("resolved"));

    expect(resource.getState()).toEqual({
      [hash([0])]: "resolved",
      [hash([1])]: "resolved",
      [hash([2])]: "resolved"
    });
  });

  it("does not run the load function if an entry is already defined", async () => {
    const resource = createKeyedResource(
      () => Promise.resolve("resolved"),
      index => index
    );

    const Example = ({ index }) => {
      const [entry] = resource.useState(index);

      return entry;
    };

    resource.setState({ 0: "other state" });

    const { container, getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example index={0} />
      </RemoteResourceBoundary>
    );

    const stopObservation = observeElement(() => {
      expect(container).not.toHaveTextContent("resolved");
      expect(container).not.toHaveTextContent("Loading...");
    }, container);

    await waitForElement(() => getByText("other state"));

    stopObservation();
  });

  it("state correctly updates when a function is given to setState", async () => {
    const resource = createKeyedResource(
      index => Promise.resolve(index === 0 ? "A" : "B"),
      index => index
    );

    const Example = ({ index }) => {
      const [entry, setState] = resource.useState(index);
      return (
        <>
          <span data-testid="value">{entry}</span>
          <button
            onClick={() => {
              setState(currentState => `${currentState}${currentState}`);
            }}
            data-testid="button"
          />
        </>
      );
    };

    const { getByTestId, getByText, rerender } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example index={0} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByTestId("value"));

    expect(getByTestId("value")).toHaveTextContent("A");
    fireEvent.click(getByTestId("button"));
    expect(getByTestId("value")).toHaveTextContent("AA");

    await rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example index={1} />
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByTestId("value"));

    expect(getByTestId("value")).toHaveTextContent("B");

    fireEvent.click(getByTestId("button"));

    await wait(() => {
      expect(getByTestId("value")).toHaveTextContent("BB");
    });
  });
});
