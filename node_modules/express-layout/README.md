# express-layout

Adds layout support to Express

## Installation

``` bash
npm install express-layout
```

## Usage

Express-layout is a middleware that overrides the standard `res.render()`
method. Initialize it with:

``` js
var express = require('express'),
    layout = require('express-layout'),
    app = express();

app.use(layout());
```

By default, `res.render()` will render the view and pass the string of html
as a `body` variable to a file named `layout` in the views folder. You can
alter the layout used by passing an option. For example:

``` js
res.render('hello-world', { layout: 'alternative' });
```

If you pass `false`, the view will not render within a layout.

You can set a global default layout name and/or directory in which to search
for layout files. These can be set by passing an options hash to the middleware
on instantiation (`layout` and `layouts` are the keys, respectively). 
Alternatively, you can set them using Express' built-in global settings:

``` js
app.set('layouts', './views/layouts');
app.set('layout', 'default');
```

Finally, an example template in jade might look like this:

``` jade
doctype 5
html(lang="en")
  head
    title Hello
  body!= body
```
