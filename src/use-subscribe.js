import { useEffect } from "react";

const useSubscribe = resource => {
  useEffect(resource.subscribe, []);
  return resource;
};

export default useSubscribe;
