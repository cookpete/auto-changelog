module.exports = function (Handlebars) {
  Handlebars.registerHelper('custom-helper', function (context, options) {
    return `Context length: ${context.length}, heading: ${options.hash.heading}, content: ${options.fn({ id: 123 })}`
  })
}
