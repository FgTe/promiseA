function Callback() {
  this.triggered = false
  this.memory = undefined
  this.execute = undefined
}
Callback.prototype.set = function (fun, args, context) {
  this.execute = fun
  if ( args !== undefined ) {
    this.memory = args
  }
  if ( this.triggered ) {
    this.trigger.apply(this, this.memory.length !== undefined ? Array.prototype.slice.call(this.memory) : [this.memory])
  }
}
Callback.prototype.trigger = function () {
  this.triggered = true
  if ( this.execute instanceof Function ) {
    this.memory = this.execute.apply(undefined, arguments)
  } else {
    this.memory = arguments
  }
}

function returnResult (result) {
  return result
}
function throwError(error) {
  throw error ? error.message ? error : new Error(error && error.errMsg || JSON.stringify(error)) : error
}
function compelete(context, status, value, callback, defaultExecution) {
  if (value && value.then instanceof Function) {
    value.then(resolve, reject)
  } else {
    context['[[PromiseStatus]]'] = status
    context['[[PromiseValue]]'] = value
    if (!callback.execute) {
      callback.set(defaultExecution)
    }
    setTimeout(function trigger() {
      callback.trigger(value)
    }, 0)
  }
}
function PromiseA (handle) {
  var that = this
  this['[[PromiseStatus]]'] = 'pending'
  this['[[PromiseValue]]'] = undefined
  this.resolveHandle = new Callback()
  this.rejectHandle = new Callback()
  function resolve (res) {
    compelete(that, 'resolved', res, that.resolveHandle, returnResult)
  }
  function reject (err) {
    compelete(that, 'rejected', err, that.rejectHandle, throwError)
  }
  try {
    handle(resolve, reject)
  } catch (err) {
    reject(err)
  }
}
function callbackProsess (context, handler, callback, fullback, resolve, reject) {
  let calling = callback instanceof Function ? callback : fullback
  handler.set(function (arg) {
    var value
    try {
      value = calling(arg)
      if (value && value.then instanceof Function) {
        value.then(resolve, reject)
      } else {
        resolve(value)
      }
    } catch (err) {
      reject(err)
    }
  })
}
PromiseA.prototype.then = function (onResolved, onRejected) {
  var resolveNextPromise
  var rejectNextPromise
  var nextPromise = new PromiseA(function (resolve, reject) {
    resolveNextPromise = resolve
    rejectNextPromise = reject
  })
  callbackProsess(this, this.resolveHandle, onResolved, returnResult, resolveNextPromise, rejectNextPromise)
  callbackProsess(this, this.rejectHandle, onRejected, throwError, resolveNextPromise, rejectNextPromise)
  return nextPromise
}
PromiseA.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
}
PromiseA.prototype.finally = function (onFinale) {
  return this.then(function (res) {
    onFinale(null, res)
    returnResult(res)
  }, function (err) {
    onFinale(err, null)
    throwError(err)
  })
}
PromiseA.resolve = function (res) {
  return new PromiseA(function (resolve, reject) { resolve(res) })
}
PromiseA.reject = function (err) {
  return new PromiseA(function (resolve, reject) { reject(err) })
}

module.exports = PromiseA