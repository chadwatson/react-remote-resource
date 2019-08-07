import * as React from "react";
import provideContext from "./provide-context";
import createResource from "./create-resource";
import createSimpleResource from "./create-simple-resource";
import { assertResourceShape } from "./__mocks__/assert-resource-shape";
import { render, waitForElement } from "@testing-library/react";

describe("provideContext", () => {
  it("is a curried function with an arity of two", () => {
    expect(typeof provideContext).toBe("function");
    expect(provideContext.length).toBe(2);

    const result = provideContext(x => x);
    expect(typeof result).toBe("function");
    expect(result.length).toBe(1);
  });

  it("creates a resource", () => {
    assertResourceShape(
      provideContext(
        x => x,
        createSimpleResource(() => Promise.resolve("resolved"))
      )
    );
  });

  it("provides the return value of the provider to the selectState function", () => {
    const value = "abc123";
    const selectState = jest
      .fn()
      .mockImplementation((state, [authToken]) => state);
    const resource = provideContext(
      () => value,
      createResource({
        selectState,
        setState: (_, __, value) => value,
        loader: authToken => Promise.resolve(authToken)
      })
    );

    const Example = () => {
      const [state] = resource.useState();
      return state;
    };

    render(
      <React.Suspense fallback={null}>
        <Example />
      </React.Suspense>
    );

    expect(selectState).toHaveBeenCalledWith(undefined, [value]);
  });

  it("provides the return value of the provider to the setState function", async () => {
    const value = "abc123";
    const setState = jest.fn().mockImplementation((_, __, value) => value);
    const resource = provideContext(
      () => value,
      createResource({
        selectState: state => state,
        setState,
        loader: authToken => Promise.resolve(authToken)
      })
    );

    const Example = () => {
      const [state] = resource.useState();
      return state;
    };

    const { getByText } = render(
      <React.Suspense fallback={null}>
        <Example />
      </React.Suspense>
    );

    await waitForElement(() => getByText(value));

    expect(setState).toHaveBeenCalledWith(undefined, [value], value);
  });

  it("provides the return value of the provider to the loader function", () => {
    const value = "abc123";
    const loader = jest
      .fn()
      .mockImplementation(authToken => Promise.resolve(authToken));
    const resource = provideContext(() => value, createSimpleResource(loader));

    const Example = () => {
      const [state] = resource.useState();
      return state;
    };

    render(
      <React.Suspense fallback={null}>
        <Example />
      </React.Suspense>
    );

    expect(loader).toHaveBeenCalledWith(value);
  });

  it("passes the arguments to useState to the provider and the loader", () => {
    const loader = jest
      .fn()
      .mockImplementation(authToken => Promise.resolve(authToken));
    const resource = provideContext(
      (x, y) => `${x}${y}`,
      createSimpleResource(loader)
    );

    const Example = () => {
      const [state] = resource.useState("abc", "123");
      return state;
    };

    render(
      <React.Suspense fallback={null}>
        <Example />
      </React.Suspense>
    );

    expect(loader).toHaveBeenCalledWith("abc123", "abc", "123");
  });

  it("can use a react hook to provide a value to the loader function", async () => {
    const AuthTokenContext = React.createContext("");
    const useAuthToken = () => React.useContext(AuthTokenContext);
    const loader = jest
      .fn()
      .mockImplementation(authToken => Promise.resolve(authToken));
    const resource = provideContext(useAuthToken, createSimpleResource(loader));

    const Example = () => {
      const [state] = resource.useState();
      return state;
    };

    render(
      <AuthTokenContext.Provider value="abc123">
        <React.Suspense fallback={null}>
          <Example />
        </React.Suspense>
      </AuthTokenContext.Provider>
    );

    expect(loader).toHaveBeenCalledWith("abc123");
  });

  it("can compose provideContexts", () => {
    const AuthTokenContext = React.createContext("");
    const CurrentSystemIdContext = React.createContext("");

    const provideAuthToken = provideContext(() =>
      React.useContext(AuthTokenContext)
    );
    const provideCurrentSystemId = provideContext(() =>
      React.useContext(CurrentSystemIdContext)
    );

    const loader = jest
      .fn()
      .mockImplementation((authToken, systemId) => Promise.resolve(authToken));

    const resource = provideCurrentSystemId(
      provideAuthToken(createSimpleResource(loader))
    );

    const Example = () => {
      const [state] = resource.useState();
      return state;
    };

    render(
      <AuthTokenContext.Provider value="abc123">
        <CurrentSystemIdContext.Provider value={12345}>
          <React.Suspense fallback={null}>
            <Example />
          </React.Suspense>
        </CurrentSystemIdContext.Provider>
      </AuthTokenContext.Provider>
    );

    expect(loader).toHaveBeenCalledWith("abc123", 12345);
  });
});
