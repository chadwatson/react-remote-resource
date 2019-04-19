import { useEffect } from "react";
import useEntry from "../use-entry";

export const ResourceConsumer = ({ resource, startValue, endValue }) => {
  const [value, setValue] = useEntry(resource, [startValue]);

  useEffect(() => {
    const timeout = endValue && setTimeout(() => setValue(endValue), 1000);
    return () => timeout && clearTimeout(timeout);
  }, [endValue]);

  return value;
};
