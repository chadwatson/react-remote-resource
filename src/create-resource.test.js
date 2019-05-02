import React, { useEffect } from "react";
import { render, waitForElement, wait } from "react-testing-library";
import createResource from "./create-resource";
import { createMockResource } from "./__mocks__/create-mock-resource";
import { assertResourceShape } from "./__mocks__/assert-resource-shape";
import RemoteResourceBoundary from "./RemoteResourceBoundary";

const selectState = jest.fn();
const setState = jest.fn();
const loader = jest.fn();
const hasState = jest.fn();

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

  it("returns a resource", () => {
    assertResourceShape(
      createResource({
        selectState,
        setState,
        loader,
        hasState
      })
    );
  });

  // ---------------------------
  // Usage Tests
  // ---------------------------

  it("can setState and getState", () => {
    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => Promise.resolve("resolved")
    });

    expect(resource.getState()).toBe(undefined);
    resource.setState("new resource state");
    expect(resource.getState()).toBe("new resource state");
  });

  it("can setState using a function", () => {
    const [resource] = createMockResource(
      value => value,
      (_, __, value) => value,
      () => Promise.resolve("resolved")
    );

    resource.setState("initial state");

    expect(resource.getState()).toBe("initial state");
    resource.setState(value => value.toUpperCase());
    expect(resource.getState()).toBe("INITIAL STATE");
  });

  it("can refresh", async () => {
    const [resource, spies] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => Promise.resolve("resolved")
    });

    expect(resource.getState()).toBe(undefined);
    await resource.refresh();
    expect(spies.loader).toHaveBeenCalled();
    expect(resource.getState()).toBe("resolved");
  });

  it("can subscribe", async () => {
    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => Promise.resolve("resolved")
    });

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
    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => Promise.resolve("resolved")
    });

    const Example = () => {
      const [entry] = resource.useState();

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
    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => Promise.resolve("resolved")
    });

    const Example = () => {
      const [entry] = resource.useState();

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

  it("updates an entry when state changes (using state setState)", async () => {
    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => Promise.resolve("resolved")
    });

    const Example = () => {
      const [entry, setEntry] = resource.useState();

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
    const [resource] = createMockResource({
      selectState: (currentState = {}, [index]) => currentState[index],
      setState: (currentState = {}, [index], value) => ({
        ...currentState,
        [index]: value
      }),
      loader: index => Promise.resolve(`${index}: resolved`)
    });

    const Example = ({ index }) => {
      const [entry, setEntry] = resource.useState(index);

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
    const [resource] = createMockResource({
      selectState: (currentState = {}, [index]) => currentState[index],
      setState: (currentState = {}, [index], value) => ({
        ...currentState,
        [index]: value
      }),
      loader: () => Promise.resolve(`loaded value`)
    });

    // ---------------------------
    // Components
    // ---------------------------

    const ExampleWithUpdates = ({ index }) => {
      const [entry, setEntry] = resource.useState(index);

      useEffect(() => {
        const timeout = setTimeout(() => setEntry(`final value`), 1000);
        return () => timeout && clearTimeout(timeout);
      }, []);

      return entry;
    };

    const ExampleStatic = ({ index }) => {
      const [entry] = resource.useState(index);

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
        <div data-testid="setState">
          <ExampleWithUpdates index={0} />
        </div>
        <div data-testid="staticExample">
          <ExampleStatic index={0} />
        </div>
      </RemoteResourceBoundary>
    );

    await waitForElement(() => getByText("Loading..."));
    const setState = await waitForElement(() => getByTestId("setState"));
    expect(setState.textContent).toBe("loaded value");

    const staticExample = await waitForElement(() =>
      getByTestId("staticExample")
    );
    expect(staticExample.textContent).toBe("loaded value");

    await wait(() => expect(setState.textContent).toBe("final value"));
    await wait(() => expect(staticExample.textContent).toBe("final value"));
  });

  it("refetches when a custom hasState function returns false", async () => {
    const [resource] = createMockResource({
      loader: keys =>
        Promise.resolve(
          keys.reduce((acc, key) => ({ ...acc, [key]: key }), {})
        ),
      selectState: (currentState = {}, [keys]) =>
        keys.reduce(
          (acc, key) =>
            currentState[key] ? { ...acc, [key]: currentState[key] } : acc,
          {}
        ),
      setState: (currentState = {}, [keys], additionalState) => ({
        ...currentState,
        ...additionalState
      }),
      hasState: (selectedState, [keys]) =>
        keys.length === Object.keys(selectedState).length
    });

    const Example = ({ keys }) => {
      const [state] = resource.useState(keys);

      return (
        <ul>
          {Object.keys(state).map(key => (
            <li key={key} data-testid={key}>
              {state[key]}
            </li>
          ))}
        </ul>
      );
    };

    const { getByText, getByTestId, rerender } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example keys={["a", "b", "c"]} />
      </RemoteResourceBoundary>
    );

    // Load function has fired and has thrown the promise
    await waitForElement(() => getByText("Loading..."));

    // Load function completed and rendered list
    await Promise.all([
      waitForElement(() => getByTestId("a")),
      waitForElement(() => getByTestId("b")),
      waitForElement(() => getByTestId("c"))
    ]);

    rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example keys={["a", "b", "c"]} />
      </RemoteResourceBoundary>
    );

    // The list is rendered without loading
    await Promise.all([
      waitForElement(() => getByTestId("a")),
      waitForElement(() => getByTestId("b")),
      waitForElement(() => getByTestId("c"))
    ]);

    const {
      getByText: getByTextRemount,
      getByTestId: getByTestIdRemount
    } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example keys={["c", "d", "e"]} />
      </RemoteResourceBoundary>
    );

    // Load function has fired and has thrown the promise
    await waitForElement(() => getByTextRemount("Loading..."));

    // Load function completed and rendered list
    await Promise.all([
      waitForElement(() => getByTestIdRemount("c")),
      waitForElement(() => getByTestIdRemount("d")),
      waitForElement(() => getByTestIdRemount("e"))
    ]);
  });
});
