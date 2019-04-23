import React, { useState } from "react";
import { render, fireEvent, waitForElement } from "react-testing-library";
import useAutoSave from "./use-auto-save";

// ---------------------------
// Mocks
// ---------------------------

const MockSaveComponent = ({ value, save, delay }) => {
  useAutoSave(value, save, delay);

  return <div>{value}</div>;
};

const MockCleanup = ({ value, save, delay }) => {
  const [show, setShow] = useState(true);

  return (
    <>
      {show ? (
        <MockSaveComponent value={value} save={save} delay={delay} />
      ) : null}
      <button onClick={() => setShow(!show)}>Toggle AutoSave</button>
    </>
  );
};

// ---------------------------
// Tests
// ---------------------------

describe("useAutoSave", () => {
  it("runs save only once in delay period", async () => {
    const spy = jest.fn();

    const { rerender } = render(
      <MockSaveComponent save={spy} value={1} delay={100} />
    );
    rerender(<MockSaveComponent save={spy} value={2} delay={100} />);
    rerender(<MockSaveComponent save={spy} value={3} delay={100} />);
    rerender(<MockSaveComponent save={spy} value={4} delay={100} />);

    await delay(100);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(4);
  });

  it("runs save on unmount", async () => {
    const spy = jest.fn();

    const { rerender, getByText } = render(
      <MockCleanup save={spy} value={1} />
    );
    rerender(<MockCleanup save={spy} value={2} />);

    const value = await waitForElement(() => getByText("2"));

    const button = getByText("Toggle AutoSave");
    fireEvent.click(button);

    expect(value).not.toBeInTheDocument();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(2);
  });

  it("defaults delay to 1000ms", async () => {
    const spy = jest.fn();

    const { rerender } = render(<MockSaveComponent save={spy} value={1} />);
    rerender(<MockSaveComponent save={spy} value={2} />);

    await delay(1000);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenLastCalledWith(2);
  });

  it("does not run save if initial value does not change", async () => {
    const spy = jest.fn();

    render(<MockSaveComponent save={spy} value={1} delay={100} />);

    await delay(100);
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not run save if initial value does not change (including rerender)", async () => {
    const spy = jest.fn();

    const { rerender } = render(
      <MockSaveComponent save={spy} value={1} delay={100} />
    );
    await delay(100);
    rerender(<MockSaveComponent save={spy} value={1} delay={100} />);
    await delay(100);
    rerender(<MockSaveComponent save={spy} value={1} delay={100} />);
    await delay(100);
    rerender(<MockSaveComponent save={spy} value={1} delay={100} />);

    expect(spy).not.toHaveBeenCalled();
  });

  it("does not run save if initial value does not change (unmount)", async () => {
    const spy = jest.fn();

    const { getByText } = render(
      <MockCleanup save={spy} value={1} delay={100} />
    );

    const button = getByText("Toggle AutoSave");
    fireEvent.click(button);

    await delay(50);

    expect(spy).not.toHaveBeenCalled();
  });
});
