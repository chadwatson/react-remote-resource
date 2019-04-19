import React, { Suspense } from "react";
import { render, waitForElement, wait } from "react-testing-library";
import { createResourceInputs } from "../__mocks__/create-resource-inputs";
import createResource from "../create-resource";
import { ResourceConsumer } from "../__mocks__/resource-consumer";

it("a resource can set an initial state", async () => {
  const { getter, setter, entryPredicate, loader } = createResourceInputs();
  const resource = createResource(getter, setter, entryPredicate, loader, () =>
    Promise.resolve("initialState")
  );

  const { getByText } = render(
    <Suspense fallback={<p>Loading...</p>}>
      <ResourceConsumer resource={resource} startValue="resolved" />
    </Suspense>
  );

  const result = await waitForElement(() => getByText("initialState"));
  expect(result.textContent).toContain("initialState");
});

it("a resource will run load function if getInitialState is not supplied.", async () => {
  const { getter, setter, entryPredicate, loader } = createResourceInputs();
  const resource = createResource(getter, setter, entryPredicate, loader);

  const { getByText } = render(
    <Suspense fallback={<p>Loading...</p>}>
      <ResourceConsumer resource={resource} startValue="resolved" />
    </Suspense>
  );

  const result = await waitForElement(() => getByText("resolved"));
  expect(result.textContent).toContain("resolved");
});
