import React, { Suspense } from "react";
import { render, waitForElement, wait } from "react-testing-library";
import { createResourceInputs } from "../__mocks__/create-resource-inputs";
import createResource from "../create-resource";
import { ResourceConsumer } from "../__mocks__/resource-consumer";

it("a resource can be consumed", async () => {
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

it("a resource can be set to a different value", async () => {
  // Warning error will be removed in react-dom 16.9.0
  // https://github.com/kentcdodds/react-testing-library/issues/281

  const { getter, setter, entryPredicate, loader } = createResourceInputs();
  const resource = createResource(getter, setter, entryPredicate, loader);

  const { container, getByText } = render(
    <Suspense fallback={<p>Loading...</p>}>
      <ResourceConsumer
        resource={resource}
        startValue="resolved"
        endValue="1"
      />
    </Suspense>
  );

  const result = await waitForElement(() => getByText("resolved"));
  expect(result.textContent).toContain("resolved");
  await wait(() => expect(container.textContent).toContain("1"));
});
