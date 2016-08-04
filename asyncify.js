/* Configure JSHint warnings, http://jshint.com/docs/options/, http://stackoverflow.com/questions/17535130/where-can-i-find-a-list-of-jshint-numeric-error-codes#17541721 *//* exported asyncify */// jshint asi:true, devel:true, eqeqeq:true, esnext:true, strict:true, undef:true, -W100

/*
Inputs a generator function which must `yield` only promises, and may
optionally return a value (which may be a `Promise`).

Returns a function which inputs the arguments of the input generator function, and
returns a `Promise` which resolves when the generator function returns `done === true`.
The return value of the generator function, or `undefined`, is the resolved value.

The optional `self` input sets the value of `this` for the generator function.

Inspiration from and wanting it to work without transpile in ES6:
  https://thomashunter.name/blog/the-long-road-to-asyncawait-in-javascript/
  http://jlongster.com/A-Study-on-Solving-Callbacks-with-JavaScript-Generators#Async-Solution--2--P
And because JSHint doesn’t yet support async/await:
  https://github.com/jshint/jshint/issues/2601#issuecomment-217740068
Wanted a solution built on correct primitives of promises & generators (e.g. not node-fibers):
  https://github.com/yortus/asyncawait#2-featuregotcha-summary
  http://howtonode.org/generators-vs-fibers
  https://blog.domenic.me/youre-missing-the-point-of-promises/
*/
function asyncify(gen, self = undefined) {
  'use strict'
  return function(...args) {
    return new Promise((resolve, reject) => {       // inputs callback functions to resolve and reject the returned `Promise`
      // Recursively iterate each `yield`ed `Promise`, resolving on the final return value of the generator function `gen`
      function iterate(itr, /*previously resolved value*/previous = undefined) {
        const {value, done} = itr.next(previous)    // ES6 destructure the returned (named elements) tuple, https://davidwalsh.name/es6-generators
        if (done)
          resolve(value)                            // `value` is the return value of `gen` or `undefined` if none
        else {
          const msg = 'Returned `value` isn’t a `Promise`'
          if (console.assert(value instanceof Promise, msg))
            reject(new TypeError(msg))
          else
            value.then (_ => iterate(itr, _))       // so recurse ourself when the `Promise` resolves
                 .catch(_ => reject(_))             // abort the iteration
        }
      }

      iterate(gen.apply(self, args))                // begin the iteration of the generator function `gen`
    })
  }
}