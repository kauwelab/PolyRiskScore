var path = require('path'),
    extend = require('obj-extend');

// Helper method to check if a variable is truthy or is set to false
function isset(variable) {
  return variable || variable === false;
}

module.exports = function (settings) {
  settings = settings || {};

  return function expressLayout (req, res, next) {
    var render = res.render,
        app = req.app,
        views = app.get('views');

    // Set the default layouts path
    if (!isset(app.get('layouts'))) {
      app.set('layouts', settings.layouts || views);
    }

    // Set the default layout name
    if (!isset(app.get('layout'))) {
      app.set('layout', isset(settings.layout) ? settings.layout : 'layout');
    }

    res.render = function (view, options, fn) {
      options = options || {};

      // Support callback function as second arg
      if ('function' === typeof options) {
        fn = options;
        options = {};
      }

      // Get the layouts path and the layout name
      var layouts = options.layouts || app.get('layouts'),
          layout = isset(options.layout) ? options.layout : app.get('layout');

      // Function to wrap the template string in the template
      var callback = function wrapInTemplate (err, str) {
        if (err) {
          return next(err);
        }

        // Call original render method passing the template string as the body
        var layoutOptions = extend({ body: str }, options);
        render.call(res, layout, layoutOptions, fn);
      };

      if (!layout) {
        // Use the original callback function if we don't have a layout
        callback = fn;
      } else {
        // Set the correct path to the layout relative to the views directory
        layout = path.relative(views, path.join(layouts, layout));
      }

      // Call the original render method with our callback
      return render.call(res, view, options, callback);
    };

    next();
  };
};
