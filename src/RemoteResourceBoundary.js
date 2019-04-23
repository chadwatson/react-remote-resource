import React, { Suspense, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import Maybe from "data.maybe";
import Context from "./Context";

const RemoteResourceBoundary = ({
  children,
  onLoadError = () => {},
  fallback,
  renderError
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

  return (
    <Context.Provider value={providerValue}>
      {error
        .map(err => renderError(err, clearError))
        .getOrElse(<Suspense fallback={fallback}>{children}</Suspense>)}
    </Context.Provider>
  );
};

RemoteResourceBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  renderError: PropTypes.func.isRequired,
  onLoadError: PropTypes.func,
  fallback: PropTypes.node.isRequired
};

export default RemoteResourceBoundary;
