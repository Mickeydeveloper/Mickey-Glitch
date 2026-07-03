const MB = require('baileys-mbuilder');

class MBuilder {
  static newLayout(name, data, extra = {}) {
    return {
      ...extra,
      view_model: {
        [Array.isArray(data) ? 'primitives' : 'primitive']: data,
        __typename: `GenAI${name}LayoutViewModel`,
      },
    };
  }

  static buildAIRich(text) {
    if (typeof text !== 'string') return null;

    try {
      return new MB.AIRich()
        .text(text)
        .extract(true)
        .hyperlink(true)
        .citation(true)
        .latex(true)
        .build();
    } catch (error) {
      return null;
    }
  }
}

module.exports = { MB, MBuilder };
