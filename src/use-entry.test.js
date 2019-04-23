import React, { useEffect } from "react";
import { render, waitForElement, wait } from "react-testing-library";
import useEntry from "./use-entry";
import RemoteResourceBoundary from "./RemoteResourceBoundary";
import { createMockResource } from "./__mocks__/create-mock-resource";

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

describe("useEntry", () => {
  it("consumes a resource", async () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      Promise.resolve.bind(Promise, "resolved")
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

  it("updates an entry when state changes (externally)", async () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      Promise.resolve.bind(Promise, "resolved")
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

    resource.setState("end result");
    await waitForElement(() => getByText("end result"));
  });

  it("updates an entry when state changes (using state setter)", async () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      Promise.resolve.bind(Promise, "resolved")
    );

    const Example = () => {
      const [entry, setEntry] = useEntry(resource);

      useEffect(() => {
        const timeout = setTimeout(() => setEntry("end result"), 1000);
        return () => timeout && clearTimeout(timeout);
      }, []);

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
    await waitForElement(() => getByText("end result"));
  });

  it("uses arguments array to scope resource by entry", async () => {
    const [resource] = createMockResource(
      (currentState = {}, [index]) => currentState[index],
      (currentState = {}, [index], value) => ({
        ...currentState,
        [index]: value
      }),
      Boolean,
      index => Promise.resolve(`${index}: resolved`)
    );

    const Example = ({ index }) => {
      const [entry, setEntry] = useEntry(resource, [index]);

      useEffect(() => {
        const timeout = setTimeout(() => setEntry(`${index}: finally`), 1000);
        return () => timeout && clearTimeout(timeout);
      }, []);

      return entry;
    };

    const { getByTestId, getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <div data-testid="0">
          <Example index={0} />
        </div>
        <div data-testid="1">
          <Example index={1} />
        </div>
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    const scope0 = await waitForElement(() => getByTestId("0"));
    expect(scope0.textContent).toBe("0: resolved");

    const scope1 = await waitForElement(() => getByTestId("1"));
    expect(scope1.textContent).toBe("1: resolved");

    await wait(() => expect(scope0.textContent).toBe("0: finally"));
    await wait(() => expect(scope1.textContent).toBe("1: finally"));
  });

  it("all components stay up to date when entry state changes", async () => {
    const [resource] = createMockResource(
      (currentState = {}, [index]) => currentState[index],
      (currentState = {}, [index], value) => ({
        ...currentState,
        [index]: value
      }),
      Boolean,
      index => Promise.resolve(`loaded value`)
    );

    // ---------------------------
    // Components
    // ---------------------------

    const ExampleWithUpdates = ({ index }) => {
      const [entry, setEntry] = useEntry(resource, [index]);

      useEffect(() => {
        const timeout = setTimeout(() => setEntry(`final value`), 1000);
        return () => timeout && clearTimeout(timeout);
      }, []);

      return entry;
    };

    const ExampleStatic = ({ index }) => {
      const [entry] = useEntry(resource, [index]);

      return entry;
    };

    // ---------------------------
    // Rendering
    // ---------------------------

    const { getByTestId, getByText } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <div data-testid="setter">
          <ExampleWithUpdates index={0} />
        </div>
        <div data-testid="staticExample">
          <ExampleStatic index={0} />
        </div>
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    const setter = await waitForElement(() => getByTestId("setter"));
    expect(setter.textContent).toBe("loaded value");

    const staticExample = await waitForElement(() =>
      getByTestId("staticExample")
    );
    expect(staticExample.textContent).toBe("loaded value");

    await wait(() => expect(setter.textContent).toBe("final value"));
    await wait(() => expect(staticExample.textContent).toBe("final value"));
  });
});
