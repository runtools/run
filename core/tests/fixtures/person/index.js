module.exports = base =>
  class Person extends base {
    async formatGreetingMethod(verb) {
      const name = this.name || 'Anonymous';
      return `${verb} ${name}!`;
    }

    async formatGreetingCommand({ageLimit}) {
      const verb = this.age < ageLimit ? 'Hi' : 'Hello';
      return await this.formatGreetingMethod(verb);
    }

    async formatWordsMethod(...words) {
      return formatWords(words, {capitalize: true});
    }

    async formatWordsCommand(...words) {
      const {capitalize, shout} = words.pop();
      return formatWords(words, {capitalize, shout});
    }

    async build() {
      this.hasBeenBuilt = true;
    }

    async publish() {}
  };

function formatWords(words, {capitalize, shout}) {
  if (!words.length) {
    return '';
  }
  words = words.join(', ') + '.';
  if (shout) {
    words = words.toUpperCase();
  } else if (capitalize) {
    words = words.slice(0, 1).toUpperCase() + words.slice(1);
  }
  return words;
}
