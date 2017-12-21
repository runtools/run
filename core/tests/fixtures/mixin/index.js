module.exports = base =>
  class Mixin extends base {
    async mixinMethod() {
      return 'mixin-method-returned-value';
    }
  };
