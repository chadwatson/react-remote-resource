import { cleanup } from "@testing-library/react";
import "jest-dom/extend-expect";

afterEach(cleanup);

// Warning error will be removed in react-dom 16.9.0
// https://github.com/kentcdodds/react-testing-library/issues/281
const originalError = console.error;

beforeAll(() => {
  console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

global.observeElement = (fn, container) => {
  fn();

  const observer = new MutationObserver(fn);

  observer.observe(container, {
    attributes: true,
    childList: true,
    subtree: true
  });

  return observer.disconnect.bind(observer);
};

global.delay = ms => new Promise(resolve => setTimeout(resolve, ms));
