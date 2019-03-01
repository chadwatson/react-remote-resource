import React, {
  Suspense,
  useState,
  useCallback,
  useMemo,
  createContext
} from "react";
import PropTypes from "prop-types";
import Maybe from "data.maybe";

export const Context = createContext({
  registerError: () => {}
});

const RemoteResourceBoundary = ({
  children,
  onLoadError,
  fallback = null,
  renderError = error => null
}) => {
  const [error, setError] = useState(Maybe.Nothing());
  const providerValue = useMemo(
    () => ({
      registerError: error => {
        setError(Maybe.of(error));
        onLoadError(error);
      }
    }),
    [onLoadError]
  );
  const clearError = useCallback(() => {
    setError(Maybe.Nothing());
  }, []);

  return error
    .map(err => renderError(err, clearError))
    .getOrElse(
      <Context.Provider value={providerValue}>
        <Suspense fallback={fallback}>{children}</Suspense>
      </Context.Provider>
    );
};

RemoteResourceBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  onLoadError: PropTypes.func.isRequired,
  fallback: PropTypes.node,
  renderError: PropTypes.func
};

export default RemoteResourceBoundary;
