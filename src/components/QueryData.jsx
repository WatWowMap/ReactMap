import React, { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@apollo/client'
import { Observable } from '@apollo/client/utilities/observables/Observable'
import Query from '@services/Query'
import Clustering from './Clustering'

const withAvailableList = ['pokestops', 'gyms', 'nests']
const filterSkipList = ['filter', 'enabled', 'legacy']

const getPolling = category => {
  switch (category) {
    default: return 0
    case 'device': return 10000
    case 'gyms': return 10000
    case 'pokestops': return 300000
    case 'weather': return 30000
  }
}

/**
 * Based on: https://github.com/drcallaway/apollo-link-timeout
 * @see AbortableLink
 * @author Mygod
 */
class AbortableContext {
  constructor() {
    this._pendingOp = [];
  }

  abortAll() {
    this._pendingOp.forEach(({
      controller, operation, observer, subscription,
    }) => {
      controller.abort(); // abort fetch operation

      // if the AbortController in the operation context is one we created,
      // it's now "used up", so we need to remove it to avoid blocking any
      // future retry of the operation.
      const context = operation.getContext();
      let fetchOptions = context.fetchOptions || {};
      if (fetchOptions.controller === controller && fetchOptions.signal === controller.signal) {
        fetchOptions = {
          ...fetchOptions,
          controller: null,
          signal: null,
        };
        operation.setContext({ fetchOptions });
      }

      observer.error(new Error('Request aborted'));
      subscription.unsubscribe();
    });
    this._pendingOp = [];
  }

  _removeOp(op) {
    const i = this._pendingOp.indexOf((v) => v === op)
    if (i === -1) return
    const last = this._pendingOp.length - 1
    if (last > 0) this._pendingOp[i] = this._pendingOp[last]
    this._pendingOp.pop()
  }

  handle(operation, forward) {
    // add abort controller and signal object to fetchOptions if they don't already exist
    const context = operation.getContext();
    let fetchOptions = context.fetchOptions || {};

    const controller = fetchOptions.controller || new AbortController();

    fetchOptions = { ...fetchOptions, controller, signal: controller.signal };
    operation.setContext({ ...context, fetchOptions });

    const chainObservable = forward(operation); // observable for remaining link chain

    // skip this link if it's a subscription request (although we will not have subscription requests)
    // if (operation.query.definitions.find(
    //   (def) => def.kind === 'OperationDefinition',
    // ).operation === 'subscription') return chainObservable;

    // create local observable with timeout functionality (unsubscibe from chain observable and
    // return an error if the timeout expires before chain observable resolves)
    return new Observable(observer => {
      const op = {
        controller, operation, observer,
      };

      // listen to chainObservable for result and pass to localObservable if received before timeout
      const subscription = chainObservable.subscribe(
        result => {
          this._removeOp(op);
          observer.next(result);
          observer.complete();
        },
        error => {
          this._removeOp(op);
          observer.error(error);
          observer.complete();
        },
      );
      op.subscription = subscription;
      this._pendingOp.push(op);

      // this function is called when a client unsubscribes from localObservable
      return () => {
        this._removeOp(op);
        subscription.unsubscribe();
      };
    });
  }
}

class RobustTimeout extends AbortableContext {
  constructor(ms) {
    super()
    this._ms = ms
    this._lastUpdated = 0
  }

  doRefetch(variables) {
    const now = Date.now()
    if (now - this._lastUpdated < (this._pendingOp.length ? 4000 : 500)) return
    this._lastUpdated = now
    this.abortAll()
    if (this._ms) {
      clearTimeout(this.timeout)
      this.timeout = setTimeout(() => this.doRefetch(), this._ms)
    }
    this.refetch(variables)
  }

  setupTimeout(refetch) {
    if (this.refetch === refetch) return
    this.refetch = refetch
    if (this._ms) this.timeout = setTimeout(() => this.doRefetch(), this._ms)
  }
}

export default function QueryData({
  bounds, onMove, map, tileStyle, zoomLevel, config, params,
  category, available, filters, staticFilters, staticUserSettings,
  userSettings, perms, path, iconModifiers, availableForms,
}) {
  const trimFilters = useCallback(requestedFilters => {
    const trimmed = {
      onlyLegacyExclude: [],
      onlyLegacy: userSettings.legacyFilter,
    }
    Object.entries(requestedFilters).forEach(topLevelFilter => {
      const [id, specifics] = topLevelFilter

      if (!filterSkipList.includes(id)) {
        trimmed[`only${id.charAt(0).toUpperCase()}${id.slice(1)}`] = specifics
      }
    })
    Object.entries(requestedFilters.filter).forEach(filter => {
      const [id, specifics] = filter

      if (specifics && specifics.enabled && staticFilters[id]) {
        if (withAvailableList.includes(category)
          && !Number.isNaN(parseInt(id.charAt(0)))) {
          if (available.includes(id)) {
            trimmed[id] = specifics
          }
        } else {
          trimmed[id] = specifics
        }
      } else if (userSettings.legacyFilter) {
        trimmed.onlyLegacyExclude.push(id)
      }
    })
    return trimmed
  }, [userSettings])

  const [timeout] = useState(() => new RobustTimeout(getPolling(category)))
  const refetchData = () => {
    onMove()
    const mapBounds = map.getBounds()
    if (category !== 'weather'
      && category !== 'device'
      && category !== 'scanAreas') {
      timeout.doRefetch({
        minLat: mapBounds._southWest.lat,
        maxLat: mapBounds._northEast.lat,
        minLon: mapBounds._southWest.lng,
        maxLon: mapBounds._northEast.lng,
        filters: trimFilters(filters),
      })
    }
  }

  useEffect(() => {
    map.on('moveend', refetchData)
    return () => {
      map.off('moveend', refetchData)
    }
  }, [filters, userSettings])

  const { data, previousData, refetch } = useQuery(Query[category](filters, perms, map.getZoom(), zoomLevel), {
    context: {
      abortableContext: timeout, // will be picked up by AbortableClient
    },
    variables: {
      ...bounds,
      filters: trimFilters(filters),
    },
    fetchPolicy: 'cache-and-network',
  })
  timeout.setupTimeout(refetch)

  const renderedData = data || previousData
  return (
    <>
      {renderedData && (
        <Clustering
          renderedData={renderedData[category]}
          zoomLevel={zoomLevel}
          map={map}
          config={config}
          filters={filters}
          path={path}
          iconModifiers={iconModifiers}
          tileStyle={tileStyle}
          perms={perms}
          availableForms={availableForms}
          category={category}
          userSettings={userSettings}
          staticUserSettings={staticUserSettings}
          params={params}
        />
      )}
    </>
  )
}
