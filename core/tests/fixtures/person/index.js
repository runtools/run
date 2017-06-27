module.exports = base =>
  class Person extends base {
    formatGreetingMethod(verb) {
      const name = this.name || 'Anonymous';
      return `${verb} ${name}!`;
    }

    formatGreetingCommand({ageLimit}) {
      const verb = this.age < ageLimit ? 'Hi' : 'Hello';
      return this.formatGreetingMethod(verb);
    }

    formatWordsMethod(...words) {
      return formatWords(words, {capitalize: true});
    }

    formatWordsCommand(...words) {
      const {capitalize, shout} = words.pop();
      return formatWords(words, {capitalize, shout});
    }
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
