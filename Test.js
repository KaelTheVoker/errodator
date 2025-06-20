import assert from 'assert';
import { Errod, Errodator } from './index.js';

// Простая функция для логирования результатов теста
function logTestResult(testName, passed, message = '') {
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testName}${message ? `: ${message}` : ''}`);
}

// Тест 1: Проверка обработки Errod
async function testErrodHandling() {
    const testName = 'Errod Handling';
    let result = null;
    const err = new Errodator(
        (error, callback) => {
            result = { message: error.message, code: error.code };
            callback();
        },
        (error, callback) => {
            result = { message: 'Unexpected Error' };
            callback();
        }
    );

    const error = new Errod('Test Errod', { code: 400 });
    await err.validate(error, () => { });

    try {
        assert.strictEqual(result.message, 'Test Errod', 'Should handle Errod message');
        assert.strictEqual(result.code, 400, 'Should handle Errod code');
        logTestResult(testName, true);
    } catch (e) {
        logTestResult(testName, false, e.message);
    }
}

// Тест 2: Проверка обработки Error
async function testErrorHandling() {
    const testName = 'Error Handling';
    let result = null;
    const err = new Errodator(
        (error, callback) => {
            result = { message: 'Unexpected Errod' };
            callback();
        },
        (error, callback) => {
            result = { message: 'Something went wrong!' };
            callback();
        }
    );

    const error = new Error('Test Error');
    await err.validate(error, () => { });

    try {
        assert.strictEqual(result.message, 'Something went wrong!', 'Should handle Error with logger');
        logTestResult(testName, true);
    } catch (e) {
        logTestResult(testName, false, e.message);
    }
}

// Тест 3: Проверка обработки внутренней ошибки в func
async function testInternalErrorInFunc() {
    const testName = 'Internal Error in Func';
    let internalErrorCalled = false;
    const err = new Errodator(
        (error, callback) => {
            throw new Error('Error in func');
        },
        (error, callback) => {
            callback();
        },
        (error, callback) => {
            internalErrorCalled = true;
            callback();
        }
    );

    const error = new Errod('Test Errod');
    await err.validate(error, () => { });

    try {
        assert.strictEqual(internalErrorCalled, true, 'Should call onInternalError when func throws');
        logTestResult(testName, true);
    } catch (e) {
        logTestResult(testName, false, e.message);
    }
}

// Тест 4: Проверка защиты от рекурсии в onInternalError
async function testRecursionProtection() {
    const testName = 'Recursion Protection';
    let internalErrorCount = 0;
    const err = new Errodator(
        (error, callback) => {
            throw new Error('Error in func');
        },
        (error, callback) => {
            callback();
        },
        (error, callback) => {
            internalErrorCount++;
            throw new Error('Error in onInternalError');
        }
    );

    const error = new Errod('Test Errod');
    await err.validate(error, () => { });

    try {
        assert.strictEqual(internalErrorCount, 1, 'onInternalError should be called only once');
        logTestResult(testName, true);
    } catch (e) {
        logTestResult(testName, false, e.message);
    }
}

// Запуск всех тестов
async function runTests() {
    console.log('Running Errodator Tests...\n');
    await testErrodHandling();
    await testErrorHandling();
    await testInternalErrorInFunc();
    await testRecursionProtection();
    console.log('\nTests Completed');
}

runTests().catch(err => console.error('Test Runner Error:', err));