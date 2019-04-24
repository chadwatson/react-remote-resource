import React, { useEffect } from "react";
import { render, waitForElement, wait } from "react-testing-library";
import createResource from "./create-resource";
import { createMockResource } from "./__mocks__/create-mock-resource";
import { assertResourceShape } from "./__mocks__/assert-resource-shape";
import RemoteResourceBoundary from "./RemoteResourceBoundary";

const getter = jest.fn();
const setter = jest.fn();
const entryPredicate = jest.fn();
const loader = jest.fn();

// ---------------------------
// Tests
// ---------------------------

describe("createResource", () => {
  // ---------------------------
  // Resource Structure Tests
  // ---------------------------

  it("is a function", () => {
    expect(typeof createResource).toBe("function");
  });

  it("is returns a function when passed a getter", () => {
    expect(typeof createResource(getter)).toBe("function");
  });

  it("is returns a function when passed a getter and setter", () => {
    expect(typeof createResource(getter, setter)).toBe("function");
  });

  it("is returns a function when passed a getter, setter, and entryPredicate", () => {
    expect(typeof createResource(getter, setter, entryPredicate)).toBe(
      "function"
    );
  });

  it("is returns a resource when passed a getter, setter, entryPredicate, and loader", () => {
    assertResourceShape(createResource(getter, setter, entryPredicate, loader));
  });

  // ---------------------------
  // Usage Tests
  // ---------------------------

  it("can setState and getState", () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      () => Promise.resolve("resolved")
    );

    expect(resource.getState()).toBe(undefined);
    resource.setState("new resource state");
    expect(resource.getState()).toBe("new resource state");
  });

  it("can setState using a function", () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      () => Promise.resolve("resolved")
    );

    resource.setState("initial state");

    expect(resource.getState()).toBe("initial state");
    resource.setState(value => value.toUpperCase());
    expect(resource.getState()).toBe("INITIAL STATE");
  });

  it("can refresh", async () => {
    const [resource, spies] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      () => Promise.resolve("resolved")
    );

    expect(resource.getState()).toBe(undefined);
    await resource.refresh();
    expect(spies.loader).toHaveBeenCalled();
    expect(resource.getState()).toBe("resolved");
  });

  it("can subscribe", async () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      () => Promise.resolve("resolved")
    );

    const spy = jest.fn().mockImplementation(() => resource.getState());

    resource.subscribe(spy);

    await resource.refresh();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveLastReturnedWith("resolved");

    resource.setState("new resource state");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveLastReturnedWith("new resource state");
  });

  it("can consume entry", async () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      Promise.resolve.bind(Promise, "resolved")
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

  it("updates an entry when state changes (externally)", async () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      Boolean,
      Promise.resolve.bind(Promise, "resolved")
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
      const [entry, setEntry] = resource.useEntry();

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
      const [entry, setEntry] = resource.useEntry(index);

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
      const [entry, setEntry] = resource.useEntry(index);

      useEffect(() => {
        const timeout = setTimeout(() => setEntry(`final value`), 1000);
        return () => timeout && clearTimeout(timeout);
      }, []);

      return entry;
    };

    const ExampleStatic = ({ index }) => {
      const [entry] = resource.useEntry(index);

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
