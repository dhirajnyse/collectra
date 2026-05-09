window.CollectraStorage = (() => {
  const key = "collectra.workspace.v1";

  function load(fallbackState) {
    try {
      const saved = window.localStorage.getItem(key);
      if (!saved) return fallbackState;
      const parsed = JSON.parse(saved);
      return {
        ...fallbackState,
        ...parsed,
        meta: { ...fallbackState.meta, ...parsed.meta },
        quoteDraft: { ...fallbackState.quoteDraft, ...parsed.quoteDraft }
      };
    } catch (error) {
      console.warn("Collectra could not load saved state", error);
      return fallbackState;
    }
  }

  function save(state) {
    window.localStorage.setItem(key, JSON.stringify(state));
  }

  function clear() {
    window.localStorage.removeItem(key);
  }

  return {
    load,
    save,
    clear
  };
})();
