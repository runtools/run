module.exports = function([msg], {verbose}) {
  if (verbose) {
    console.trace(msg);
  }
};
