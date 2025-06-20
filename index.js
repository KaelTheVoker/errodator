class Errod extends Error {
    constructor(message, ...args) {
        super(message);
        this.name = 'Errod';
        Object.assign(this, ...args);
    }
}

const basicInternalError = (error) => {
    console.error('\x1b[31mErrodator >> Internal error:', error.message, '\x1b[0m');
    if (error.cause) {
        console.error('\x1b[31mErrodator >> Caused by:', error.cause, '\x1b[0m');
    }
}

class Errodator {
    constructor(func, logger, onInternalError = basicInternalError) {
        this.func = func
        this.logger = logger
        this.onInternalError = onInternalError

        if (typeof this.func !== 'function') {
            throw new Error('Errodator: `func` argument must be a function');
        }
        if (typeof this.logger !== 'function') {
            throw new Error('Errodator: `logger` argument must be a function');
        }
        if (typeof this.onInternalError !== 'function') {
            console.log(typeof this.onInternalError)
            throw new Error('Errodator: `onInternalError` argument must be a function');
        }
    }

    async validate(error, ...args) {
        let isHandlingInternalError = false;

        try {
            if (error instanceof Errod) {
                await this.func(error, ...args);
            } else {
                await this.logger(error, ...args);
            }
        } catch (internalError) {
            if (isHandlingInternalError) {
                console.error('\x1b[31mErrodator >> Recursive internal error detected:', internalError.message, '\x1b[0m');
                return;
            }

            isHandlingInternalError = true;
            try {
                await this.onInternalError(internalError, ...args);
            } catch (recursiveError) {
                console.error('\x1b[31mErrodator >> Error in onInternalError:', recursiveError.message, '\x1b[0m');
                if (recursiveError.cause) {
                    console.error('\x1b[31mErrodator >> Caused by:', recursiveError.cause, '\x1b[0m');
                }
            }
        }
    }
}

export { Errod, Errodator };
