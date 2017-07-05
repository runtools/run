module.exports = base =>
  class Address extends base {
    static $normalize(definition, options) {
      if (typeof definition === 'string') {
        const [city, country] = definition.split(',');
        definition = {city: city && city.trim(), country: country && country.trim()};
      }
      return super.$normalize(definition, options);
    }

    $serialize(options) {
      let definition = super.$serialize(options);

      if (typeof definition === 'object') {
        let string;
        const rest = Object.assign({}, definition);

        if (rest.city !== undefined) {
          string = rest.city;
          delete rest.city;
        }

        if (rest.country !== undefined) {
          if (!string) {
            throw new Error('Cannot have a \'country\' without a \'city\'');
          }
          string += ', ' + rest.country;
          delete rest.country;
        }

        if (Object.keys(rest).length === 0) {
          definition = string;
        }
      }

      return definition;
    }
  };
