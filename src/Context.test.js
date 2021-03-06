import React, { useContext, useLayoutEffect } from "react";
import Context from "./Context";
import { render } from "@testing-library/react";

const Consumer = () => {
  const { registerError } = useContext(Context);

  useLayoutEffect(() => {
    registerError();
  });

  return null;
};

describe("Context", () => {
  it("defaults to noop if non item is passed in.", () => {
    render(<Consumer />);
  });
});
