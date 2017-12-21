module.exports = base =>
  class Mixin extends base {
    async mixinMethod() {
      return {result: 'mixin-method-returned-value'};
    }
  };
