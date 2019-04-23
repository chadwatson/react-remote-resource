import React from "react";
import { render, fireEvent } from "react-testing-library";
import useAutoSave from "./use-auto-save";

// ---------------------------
// Mocks
// ---------------------------

const MockSaveComponent = ({ value, save, delay }) => {
  useAutoSave(value, save, delay);

  return <div>{value}</div>;
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

    const { unmount, rerender } = render(
      <MockSaveComponent save={spy} value={1} />
    );
    rerender(<MockSaveComponent save={spy} value={2} />);
    unmount();

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

    const { unmount } = render(
      <MockSaveComponent save={spy} value={1} delay={100} />
    );

    await delay(100);
    unmount();
    expect(spy).not.toHaveBeenCalled();
  });
});
