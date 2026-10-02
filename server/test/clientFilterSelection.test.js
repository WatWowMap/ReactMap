const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')
const ts = require('typescript')

// Compile the client modules for Node and isolate their React, Apollo, and
// store boundaries while exercising the actual selection and refresh code.
function loadClientModule(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, '../../', relativePath)
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  })
  const exports = {}
  vm.runInNewContext(
    outputText,
    {
      exports,
      require: (name) => {
        if (name in mocks) return mocks[name]
        if (name.startsWith('@mui/')) return { default: path.basename(name) }
        throw new Error(`Unexpected client import: ${name}`)
      },
      structuredClone,
      localStorage: { setItem() {} },
    },
    { filename },
  )
  return exports
}

const selection = loadClientModule('src/utils/filterSelection.js')
const { deepMerge } = loadClientModule('src/utils/deepMerge.js')
const { generateSlots } = loadClientModule('src/utils/generateSlots.js')

const filter = (enabled, overrides = {}) => ({
  enabled,
  all: false,
  size: 'md',
  adv: '',
  ...overrides,
})

function findButton(element, color) {
  if (element?.type === 'IconButton' && element.props.color === color) {
    return element
  }
  return element?.props?.children
    ?.flat()
    .map((child) => findButton(child, color))
    .find(Boolean)
}

function createClient(definitions, storedFilters = definitions) {
  let storage = {
    filters: structuredClone(storedFilters),
    menus: Object.fromEntries(
      Object.keys(definitions).map((category) => [
        category,
        { filters: { others: { onlyAvailable: true } } },
      ]),
    ),
    searches: {},
    icons: {},
    audio: {},
  }
  const asset = { build() {}, checkValid: () => false, selection: {} }
  let memory = {
    filters: definitions,
    Icons: asset,
    Audio: asset,
    online: true,
    active: false,
    available: {},
    featureFlags: {},
  }
  let data
  const effects = []
  const useStorage = (selector) => selector(storage)
  useStorage.getState = () => storage
  useStorage.setState = (update) => {
    storage = {
      ...storage,
      ...(typeof update === 'function' ? update(storage) : update),
    }
  }
  const useMemory = (selector) => selector(memory)
  useMemory.getState = () => memory
  useMemory.setState = (update) => {
    memory = { ...memory, ...update(memory) }
  }
  const mocks = {
    react: {
      useEffect: (effect) => effects.push(effect),
      useMemo: (callback) => callback(),
      useCallback: (callback) => callback,
      memo: (component) => component,
      createElement: (type, props, ...children) => ({
        type,
        props: { ...props, children },
      }),
    },
    'react-i18next': { useTranslation: () => ({ t: (key) => key }) },
    '@apollo/client': { useQuery: () => ({ data, loading: false }) },
    '@mui/material/utils': {
      capitalize: (value) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    '@store/useMemory': { useMemory },
    '@store/useStorage': { useStorage },
    '@store/useLayoutStore': { useLayoutStore: (selector) => selector({}) },
    '@utils/deepMerge': { deepMerge },
    '@utils/filterSelection': selection,
    '@utils/generateSlots': { generateSlots },
    '@utils/getAmbiguousForms': {
      getAmbiguousForms: () => new Set(),
      hasAmbiguousForm: () => false,
    },
    '@services/Assets': {},
    '@services/queries/available': { GET_MAP_DATA: {} },
    '@hooks/useProcessError': { useProcessError() {} },
    '@hooks/useTranslateById': {
      useTranslateById: () => ({ t: (key) => key }),
    },
    '@hooks/useGetAvailable': {
      useGetAvailable: (category) => ({
        available: Object.keys(memory.filters[category].filter),
      }),
    },
    '@components/virtual/VirtualGrid': { VirtualGrid: 'VirtualGrid' },
    '@components/TabPanel': {},
    '@components/inputs/BoolToggle': {},
    '@components/inputs/GenericSearch': {},
    '@components/virtual/StandardItem': {},
    '../hooks/useScrollMemory': {
      getDrawerGridState() {},
      useDrawerScrollMemory: () => ({}),
    },
  }
  const { applyToAll } = loadClientModule('src/utils/applyToAll.js', mocks)
  const { useMapData } = loadClientModule('src/hooks/useMapData.js', mocks)
  const { SelectorListMemo } = loadClientModule(
    'src/features/drawer/components/SelectorList.jsx',
    mocks,
  )

  return {
    state: () => storage,
    applyToAll,
    refresh: (filters) => {
      data = {
        available: {
          filters,
          icons: { styles: {} },
          audio: { styles: {} },
          masterfile: { pokemon: {}, questRewardTypes: {} },
          questConditions: {},
        },
      }
      useMapData(true)
      effects.splice(0).forEach((effect) => effect())
    },
    select: (category, subCategory, enabled) => {
      const rendered = SelectorListMemo({ category, subCategory })
      const button = findButton(rendered, enabled ? 'success' : 'error')
      assert.ok(button, `Missing bulk selection button for ${category}`)
      button.props.onClick()
    },
  }
}

const categoryCases = [
  ['pokemon', '19-0', '25-0'],
  ['gyms', '19-0', '25-0'],
  ['pokestops', 'a19-0', 'a25-0'],
  ['nests', '19-0', '25-0'],
  ['stations', '19-0', '25-0'],
  ['tappables', 'q1', 'q2'],
]

test('advanced bulk choices control future entries in every category', () => {
  categoryCases.forEach(([category, existingKey, newKey]) => {
    ;[true, false].forEach((enabled) => {
      const definitions = {
        [category]: {
          filter: {
            ...(category === 'tappables' ? {} : { global: filter(false) }),
            [existingKey]: filter(!enabled),
          },
        },
      }
      const client = createClient(definitions)
      client.applyToAll({ enabled }, category, [existingKey])
      const stored = client.state().filters[category]
      assert.equal(stored.selectionDefaults.all, enabled)
      assert.equal(stored.filter[existingKey].enabled, enabled)
      stored.filter[existingKey] = filter(!enabled, {
        size: 'xl',
        adv: 'saved',
      })

      const next = structuredClone(definitions)
      next[category].filter[newKey] = filter(!enabled, { size: 'sm' })
      client.refresh(next)
      assert.equal(
        client.state().filters[category].filter[newKey].enabled,
        enabled,
      )
      assert.equal(client.state().filters[category].filter[newKey].size, 'sm')
      assert.equal(
        client.state().filters[category].filter[existingKey].enabled,
        !enabled,
      )
      assert.equal(
        client.state().filters[category].filter[existingKey].adv,
        'saved',
      )
    })
  })
})

test('untouched selections retain server defaults across refreshes', () => {
  categoryCases.forEach(([category, existingKey, newKey]) => {
    const definitions = {
      [category]: {
        filter: { global: filter(false), [existingKey]: filter(true) },
      },
    }
    const client = createClient(definitions, {})
    client.refresh(definitions)
    const next = structuredClone(definitions)
    next[category].filter[newKey] = filter(true)
    client.refresh(next)
    assert.equal(client.state().filters[category].filter[newKey].enabled, true)
    assert.equal(client.state().filters[category].selectionDefaults, undefined)
  })
})

test('previously saved global preferences still apply to new entries', () => {
  categoryCases.forEach(([category, existingKey, newKey]) => {
    const definitions = {
      [category]: {
        filter: { global: filter(false), [existingKey]: filter(false) },
      },
    }
    const saved = structuredClone(definitions)
    saved[category].filter.global.enabled = true
    const client = createClient(definitions, saved)
    const next = structuredClone(definitions)
    next[category].filter[newKey] = filter(false)
    client.refresh(next)
    assert.equal(client.state().filters[category].filter[newKey].enabled, true)
    assert.equal(
      client.state().filters[category].filter[existingKey].enabled,
      false,
    )
  })
})

const drawerCases = [
  ['pokemon', undefined, '19-0', '25-0'],
  ['nests', undefined, '19-0', '25-0'],
  ['stations', undefined, '19-0', '25-0'],
  ['tappables', undefined, 'q1', 'q2'],
  ['gyms', undefined, 't1-0', 't2-0'],
  ['gyms', 'raids', 'e1', 'e2'],
  ['gyms', 'pokemon', '19-0', '25-0'],
  ['pokestops', 'rocketPokemon', 'a19-0', 'a25-0'],
  ['pokestops', 'invasions', 'i1', 'i2'],
  ['pokestops', 'quests', 'q1', 'm3-10'],
  ['pokestops', 'lures', 'l501', 'l502'],
  ['pokestops', 'showcase', 'f19-0', 'y3'],
  ['pokestops', 'pokemon', '19-0', '25-0'],
]

test('drawer bulk choices apply to future entries in each list', () => {
  drawerCases.forEach(([category, scope, existingKey, newKey]) => {
    ;[true, false].forEach((enabled) => {
      const definitions = {
        [category]: {
          filter: { global: filter(false), [existingKey]: filter(!enabled) },
        },
      }
      const client = createClient(definitions)
      client.select(category, scope, enabled)
      assert.equal(
        client.state().filters[category].filter[existingKey].enabled,
        enabled,
      )
      assert.equal(
        client.state().filters[category].selectionDefaults[scope || 'default'],
        enabled,
      )
      const next = structuredClone(definitions)
      next[category].filter[newKey] = filter(!enabled)
      client.refresh(next)
      assert.equal(
        client.state().filters[category].filter[newKey].enabled,
        enabled,
      )
    })
  })
})

test('Rocket drawer defaults do not change quests, lures, or other categories', () => {
  const definitions = {
    pokestops: {
      filter: {
        global: filter(false),
        a19: filter(true),
        q1: filter(true),
        l501: filter(true),
      },
    },
    gyms: { filter: { global: filter(false), '19-0': filter(true) } },
  }
  const client = createClient(definitions)
  client.select('pokestops', 'rocketPokemon', false)
  const next = structuredClone(definitions)
  next.pokestops.filter.a25 = filter(true)
  next.pokestops.filter.q2 = filter(true)
  next.pokestops.filter.l502 = filter(true)
  next.gyms.filter['25-0'] = filter(true)
  client.refresh(next)
  assert.equal(client.state().filters.pokestops.filter.a25.enabled, false)
  assert.equal(client.state().filters.pokestops.filter.q2.enabled, true)
  assert.equal(client.state().filters.pokestops.filter.l502.enabled, true)
  assert.equal(client.state().filters.gyms.filter['25-0'].enabled, true)
})

test('scoped choices override a category default until the next full bulk choice', () => {
  const definitions = {
    pokestops: {
      filter: { global: filter(false), a19: filter(true), q1: filter(true) },
    },
  }
  const client = createClient(definitions)
  client.applyToAll({ enabled: true }, 'pokestops', ['a19', 'q1'])
  client.select('pokestops', 'rocketPokemon', false)
  const next = structuredClone(definitions)
  next.pokestops.filter.a25 = filter(true)
  next.pokestops.filter.q2 = filter(false)
  client.refresh(next)
  assert.equal(client.state().filters.pokestops.filter.a25.enabled, false)
  assert.equal(client.state().filters.pokestops.filter.q2.enabled, true)

  client.applyToAll({ enabled: true }, 'pokestops', ['a19', 'a25', 'q1', 'q2'])
  const final = structuredClone(next)
  final.pokestops.filter.a26 = filter(false)
  client.refresh(final)
  assert.equal(client.state().filters.pokestops.filter.a26.enabled, true)
  assert.equal(
    client.state().filters.pokestops.selectionDefaults.rocketPokemon,
    undefined,
  )
})

test('filtered drawer and advanced actions leave future-selection defaults intact', () => {
  const definitions = {
    pokestops: {
      filter: { global: filter(false), a19: filter(true), a25: filter(true) },
    },
  }
  const client = createClient(definitions)
  client.applyToAll({ enabled: false }, 'pokestops', ['a19', 'a25'])
  client.state().searches.pokestopsRocketPokemonQuickSelect = '19'
  client.select('pokestops', 'rocketPokemon', true)
  assert.equal(client.state().filters.pokestops.filter.a19.enabled, true)
  assert.equal(client.state().filters.pokestops.filter.a25.enabled, false)
  assert.equal(
    client.state().filters.pokestops.selectionDefaults.rocketPokemon,
    undefined,
  )

  client.state().searches.pokestopsAdvanced = '25'
  client.applyToAll({ enabled: true }, 'pokestops', ['a25'])
  client.state().searches.pokestopsAdvanced = ''
  client.state().menus.pokestops = {
    filters: { categories: { rocket_pokemon: true } },
  }
  client.applyToAll({ enabled: true }, 'pokestops', ['a19', 'a25'])
  assert.equal(client.state().filters.pokestops.selectionDefaults.all, false)
  const next = structuredClone(definitions)
  next.pokestops.filter.a26 = filter(true)
  client.refresh(next)
  assert.equal(client.state().filters.pokestops.filter.a26.enabled, false)
})

test('Rocket unknown/exact form replacements preserve individual choices over defaults', () => {
  ;[
    ['a19', ['a19-0', 'a19-1']],
    ['a19-0', ['a19']],
    ['a19-undefined', ['a19-0']],
  ].forEach(([previousKey, newKeys]) => {
    const definitions = {
      pokestops: {
        filter: { global: filter(false), [previousKey]: filter(false) },
      },
    }
    const saved = structuredClone(definitions)
    saved.pokestops.filter[previousKey] = filter(false, {
      size: 'xl',
      adv: 'saved',
    })
    saved.pokestops.selectionDefaults = { rocketPokemon: true }
    const client = createClient(definitions, saved)
    const next = {
      pokestops: {
        filter: {
          global: filter(false),
          a25: filter(false),
          ...Object.fromEntries(newKeys.map((key) => [key, filter(true)])),
        },
      },
    }
    client.refresh(next)
    newKeys.forEach((key) => {
      assert.equal(client.state().filters.pokestops.filter[key].enabled, false)
      assert.equal(client.state().filters.pokestops.filter[key].size, 'xl')
      assert.equal(client.state().filters.pokestops.filter[key].adv, 'saved')
    })
    assert.equal(
      client.state().filters.pokestops.filter[previousKey],
      undefined,
    )
    assert.equal(client.state().filters.pokestops.filter.a25.enabled, true)
  })
})
