# Errodator

[![npm version](https://img.shields.io/npm/v/errodator.svg)](https://www.npmjs.com/package/errodator)

**Errodator** is a lightweight, flexible error handling library for JavaScript, designed to streamline safe and scalable error processing in asynchronous applications. It lets you distinguish between custom errors (`Errod`) and system errors (`Error`) with fully customizable handlers, ensuring you avoid exposing sensitive stack traces while keeping your code DRY. Errodator works seamlessly with any JavaScript framework (Express, Koa, Fastify) or vanilla Node.js, giving you complete control over error handling, logging, and responses.

## Why Errodator?

Handling errors in JavaScript can be messy and risky. A simple `try { throw new Error() } catch (res.send(error.message))` can accidentally expose stack traces, leading to security vulnerabilities. Alternatively, wrapping every error in `res.status(...).json({})` is safe but verbose, unscalable, and repetitive—especially for validation or API errors. You could throw custom errors and handle them separately in `catch`, but that introduces boilerplate and risks missing edge cases.

Errodator solves these problems by centralizing error handling. You define a single, reusable behavior for custom (`Errod`) and system (`Error`) errors, then use `throw`, `catch`, and `validate` everywhere. This approach is:
- **Safe**: Prevents leaking sensitive stack traces.
- **Scalable**: One configuration handles all errors consistently.
- **Flexible**: Customize handlers for any framework or context.
- **Minimal**: Reduces boilerplate compared to manual error handling.

## Features
- **Custom Errors (`Errod`)**: Create errors with arbitrary metadata.
- **Flexible Handlers**: Separate processing for custom and system errors.
- **Async Support**: Full compatibility with `async/await`.
- **Framework-Agnostic**: Use with Express, Koa, Fastify, or any context via `...args`.
- **Internal Error Safety**: Handles errors in user-defined handlers with recursion protection.
- **Zero Dependencies**: Lightweight and lean.
- **User-Controlled Responses**: You decide how to format responses (JSON, text, etc.).

## Installation
Install via npm:

```bash
npm install errodator
```

Ensure your project uses ES modules by adding `"type": "module"` to `package.json`.

## Quick Start
Example using Errodator with Express:

```javascript
import express from 'express';
import { Errod, Errodator } from 'errodator';

const app = express();
const port = 3000;

// Configure Errodator
const err = new Errodator(
  // Handler for Errod (custom errors)
  (error, res, metadata = {}) => {
    res.status(metadata.code || 400).json({ error: error.message, details: metadata.details });
    if (metadata.logData) console.log('Log:', metadata.logData);
  },
  // Handler for Error (system errors)
  (error, res, metadata = {}) => {
    res.status(metadata.code || 500).json({ error: 'Something went wrong!' });
    console.error('System error:', error.message);
  },
  // Handler for internal errors
  (error, res, metadata = {}) => {
    res.status(metadata.code || 500).json({ error: 'Internal server error' });
    console.error('Internal error:', error.message);
  }
);

// Example route
app.get('/', (req, res) => {
  try {
    if (Math.random() < 0.5) {
      throw new Errod('Invalid input', { code: 400, details: { field: 'email' }, logData: 'Validation failed' });
    } else {
      throw new Error('System failure');
    }
  } catch (error) {
    err.validate(error, res, { code: error.code || 400, details: error.details });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
```

This example shows:
- Setting up Errodator with handlers for custom, system, and internal errors.
- Throwing `Errod` with metadata (`code`, `details`, `logData`).
- Passing metadata via `...args` for flexible responses.

## API

### `Errod`
A custom error class extending `Error`.

```javascript
new Errod(message, ...args)
```

- **Parameters**:
  - `message` (string): Error message.
  - `...args` (objects): Optional objects merged into the `Errod` instance via `Object.assign`.
- **Returns**: `Errod` instance with `name` set to `'Errod'` and custom properties from `...args`.

**Example**:
```javascript
const error = new Errod('Access denied', { code: 403, userId: 123 });
console.log(error.message); // 'Access denied'
console.log(error.name); // 'Errod'
console.log(error.code); // 403
console.log(error.userId); // 123
```

### `Errodator`
Core error handling class.

```javascript
new Errodator(func, logger, onInternalError)
```

- **Parameters**:
  - `func` (function): Handles `Errod` instances. Receives the error and `...args` from `validate`.
  - `logger` (function): Handles non-`Errod` errors (e.g., `Error`). Receives the error and `...args` from `validate`.
  - `onInternalError` (function, optional): Handles errors thrown by `func` or `logger`. Defaults to `basicInternalError` (console logging). Receives the error and `...args` from `validate`.
- **Throws**:
  - `Error` if `func`, `logger`, or `onInternalError` are not functions.
- **Returns**: `Errodator` instance.

**Methods**:
- `async validate(error, ...args)`:
  - Processes the error.
  - Calls `func(error, ...args)` for `Errod`.
  - Calls `logger(error, ...args)` for non-`Errod`.
  - Calls `onInternalError(error, ...args)` if `func` or `logger` throw, with recursion protection.

**Example**:
```javascript
const err = new Errodator(
  (error, res) => res.json({ error: error.message }),
  (error, res) => res.json({ error: 'System error' }),
  (error, res) => res.json({ error: 'Internal error' })
);

try {
  throw new Errod('Test');
} catch (error) {
  err.validate(error, res);
}
```

## Features in Detail

### 1. Custom Error Metadata
Attach any properties to `Errod` via `...args`.

**Example**:
```javascript
throw new Errod('Unauthorized', { code: 403, userId: 123, logData: 'Access attempt' });
```

Access metadata in handlers:
```javascript
const err = new Errodator(
  (error, res) => res.status(error.code || 400).json({ error: error.message, userId: error.userId }),
  (error, res) => res.status(500).json({ error: 'System error' })
);
```

### 2. Asynchronous Handlers
Supports `async` handlers for operations like database queries.

**Example**:
```javascript
const err = new Errodator(
  async (error, res) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    res.status(400).json({ error: error.message });
  },
  async (error, res) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    res.status(500).json({ error: 'System error' });
  }
);
```

### 3. Flexible Context Passing
Pass any context (e.g., Express `res`, Koa `ctx`) via `...args` in `validate`.

**Example with Koa**:
```javascript
import Koa from 'koa';
import { Errod, Errodator } from 'errodator';

const app = new Koa();
const err = new Errodator(
  (error, ctx) => {
    ctx.status = 400;
    ctx.body = { error: error.message };
  },
  (error, ctx) => {
    ctx.status = 500;
    ctx.body = { error: 'System error' };
  }
);

app.use(async (ctx) => {
  try {
    throw new Errod('Test');
  } catch (error) {
    await err.validate(error, ctx);
  }
});

app.listen(3000);
```

### 4. Internal Error Safety
Handles errors thrown by `func` or `logger` via `onInternalError`, with protection against recursion.

**Example**:
```javascript
const err = new Errodator(
  (error) => { throw new Error('Func failure'); },
  (error, res) => res.status(500).json({ error: 'System error' }),
  (error, res) => res.status(500).json({ error: 'Internal error' })
);

try {
  throw new Errod('Test');
} catch (error) {
  err.validate(error, res);
}
```

### 5. Default Internal Error Handler
`basicInternalError` logs errors with colorized output and `error.cause` if present.

**Example Output**:
```
Errodator >> Internal error: Func failure
Errodator >> Caused by: Some cause
```

Override with a custom handler:
```javascript
const err = new Errodator(
  (error, res) => res.status(400).json({ error: error.message }),
  (error, res) => res.status(500).json({ error: 'System error' }),
  (error, res) => {
    console.log('Custom log:', error.message);
    res.status(500).json({ error: 'Internal error' });
  }
);
```

### 6. Error Cause Support
Access `error.cause` in `logger` or `onInternalError` for chained errors.

**Example**:
```javascript
const err = new Errodator(
  (error, res) => res.status(400).json({ error: error.message }),
  (error, res) => {
    res.status(500).json({ error: 'System error', cause: error.cause?.message });
    console.log('Cause:', error.cause);
  }
);

try {
  throw new Error('Failure', { cause: new Error('Database error') });
} catch (error) {
  err.validate(error, res);
}
```

## Important Notes
- **Client Responses**: Always send a response in `func`, `logger`, or `onInternalError` to avoid hanging HTTP requests.
- **Safe Handlers**: Ensure `onInternalError` does not throw errors, though Errodator prevents recursion.
- **Metadata**: Use `...args` to pass custom data (e.g., `{ code: 400, details: { ... } }`).
- **Compatibility**: Pass the appropriate context (e.g., `res` for Express, `ctx` for Koa) via `...args`.

## Troubleshooting
- **Requests Hang**: Check that `func`, `logger`, or `onInternalError` send a response (e.g., `res.json()`).
- **TypeError**: Ensure `func`, `logger`, and `onInternalError` are functions.
- **No Cause Logged**: Verify the error has a `cause` property and access it in `logger` or `onInternalError`.

## Contributing
Contributions are welcome! Open an issue or pull request on [GitHub](https://github.com/KaelTheVoker/errodator). Future ideas:
- Framework-specific modules (e.g., `express-errodator`).
- Preset configurations.
- Support for multiple error types.

## License
MIT

## Version
1.0.0
