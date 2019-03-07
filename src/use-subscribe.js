import { useEffect } from "react";

const useSubscribe = resource => {
  useEffect(resource.actions.subscribe, [resource.actions]);
  return resource;
};

export default useSubscribe;
