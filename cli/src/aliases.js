const Aliases = {
  normalize(aliases) {
    let normalizedAliases = aliases;
    if (!normalizedAliases) {
      normalizedAliases = [];
    }
    if (!Array.isArray(normalizedAliases)) {
      normalizedAliases = [normalizedAliases];
    }
    return normalizedAliases;
  }
};

export default Aliases;
