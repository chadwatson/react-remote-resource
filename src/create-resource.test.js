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
        hasState,
        expireAfter: 100
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

  it("does not update data on remount even after entry is expired.", async () => {
    // ---------------------------
    // Setup
    // ---------------------------

    // This resource should increment it's count when the entries expire (after 100ms)

    let count = 0;

    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => {
        count += 1;
        return Promise.resolve(count);
      },
      expireAfter: 100
    });

    // Component uses specific resource entry then renders current count

    const Example = () => {
      const [entry] = resource.useState();

      return entry;
    };

    // ---------------------------
    // Rendering
    // ---------------------------

    // Initial render (initilizes resource - no entry should exist)
    const { container, getByText, rerender } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    // Load function has fired and has thrown the promise
    await waitForElement(() => getByText("Loading..."));

    // Load function completed and returned count
    await waitForElement(() => getByText("1"));

    rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    // The cached entry is used instead of hitting the load function
    await waitForElement(() => getByText("1"));

    // Wait until after the expiration of the resource entry
    await delay(100);

    // Ensure that the load function is not called again
    const stopObservation = observeElement(() => {
      expect(container).not.toHaveTextContent("2");
      expect(container).not.toHaveTextContent("Loading...");
    }, container);

    rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    // Set the observation period to 100ms
    await delay(100);

    stopObservation();
  });

  it("refreshes data after expiration (mount)", async () => {
    // ---------------------------
    // Setup
    // ---------------------------

    // This resource should increment it's count when the entries expire (after 100ms)

    let count = 0;

    const [resource] = createMockResource({
      selectState: value => value,
      setState: (_, __, value) => value,
      loader: () => {
        count += 1;
        return Promise.resolve(count);
      },
      expireAfter: 100
    });

    // Component uses specific resource entry then renders current count

    const Example = () => {
      const [entry] = resource.useState();

      return entry;
    };

    // ---------------------------
    // Rendering
    // ---------------------------

    // Initial render (initilizes resource - no entry should exist)

    const { getByText, rerender, unmount } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    // Load function has fired and has thrown the promise
    await waitForElement(() => getByText("Loading..."));

    // Load function completed and returned count
    await waitForElement(() => getByText("1"));

    rerender(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    // The cached entry is used instead of hitting the load function
    await waitForElement(() => getByText("1"));

    // Wait until after the expiration of the resource entry
    await delay(100);

    unmount();

    // Remount a new component using the resource
    const { getByText: getByTextRemount } = render(
      <RemoteResourceBoundary
        fallback={<p>Loading...</p>}
        renderError={() => <p>error</p>}
      >
        <Example />
      </RemoteResourceBoundary>
    );

    // Load function has fired and has thrown the promise
    await waitForElement(() => getByTextRemount("Loading..."));

    // Load function completed and returned count
    await waitForElement(() => getByTextRemount("2"));
  });
});
