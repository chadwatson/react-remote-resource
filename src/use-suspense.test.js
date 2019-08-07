import React, { Suspense, useState } from "react";
import { render, waitForElement, fireEvent } from "@testing-library/react";
import useSuspense from "./use-suspense";

// ---------------------------
// Mocks
// ---------------------------

const SuspenseButton = ({ count, setCount, onClick }) => (
  <button
    onClick={useSuspense(() => onClick().then(() => setCount(count + 1)))}
  >
    {count}
  </button>
);

const Example = ({ onClick }) => {
  const [count, setCount] = useState(0);

  return (
    <Suspense fallback="Loading...">
      <SuspenseButton count={count} setCount={setCount} onClick={onClick} />
    </Suspense>
  );
};

// ---------------------------
// Tests
// ---------------------------

describe("useSuspense", () => {
  it("shows fallback then loads when promise resolves", async () => {
    const { getByText } = render(<Example onClick={() => delay(100)} />);
    const button = await waitForElement(() => getByText("0"));
    fireEvent.click(button);

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("1"));
  });

  it("shows fallback when promise rejects", async () => {
    const { getByText } = render(
      <Example onClick={() => delay(100).then(() => Promise.reject())} />
    );
    const button = await waitForElement(() => getByText("0"));
    fireEvent.click(button);

    await waitForElement(() => getByText("Loading..."));
    await waitForElement(() => getByText("0"));
  });
});
