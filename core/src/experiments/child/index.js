module.exports = () => ({
  async hello() {
    await super.hello();
    console.log('child');
    await this.brother();
  },

  async brother() {
    console.log('brother');
  }
});
