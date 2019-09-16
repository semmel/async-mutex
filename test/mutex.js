const
   assert = require('assert'),
   createMutex = require('../src/index').createMutex,
   MutexTimeoutError = require('../src/index').MutexTimeoutError;


suite('Mutex', function() {

    let mutex;

    setup(() => mutex = createMutex());

    test('ownership is exclusive', function() {
        let flag = false;

        mutex
            .acquire()
            .then(release => setTimeout(() => {
                assert.ok(flag === false);
                flag = true;
                release();
            }, 50));

        return mutex.acquire()
            .then((release) => {
                release();

                assert(flag);
            });
    });

    test('runExclusive passes result (immediate)', function() {
        return mutex
            .runExclusive(() => 10)
            .then(value => assert.strictEqual(value, 10));
    });

    test('runExclusive passes result (promise)', function() {
        return mutex
            .runExclusive(() => Promise.resolve(10))
            .then(value => assert.strictEqual(value, 10));
    });

    test('runExclusive passes rejection', function() {
        return mutex
            .runExclusive(() => Promise.reject('foo'))
            .then(
                () => Promise.reject('should have been rejected'),
                value => assert.strictEqual(value, 'foo')
            );
    });

    test('runExclusive passes exception', function() {
        return mutex
            .runExclusive(() => {
                // tslint:disable-next-line:no-string-throw
                throw 'foo';
            })
            .then(
                () => Promise.reject('should have been rejected'),
                value => assert.strictEqual(value, 'foo')
            );
    });

    test('runExclusive is exclusive', function() {
        let flag = false;

        mutex
            .runExclusive(() => new Promise(
            resolve => setTimeout(
                () => {
                    flag = true;
                    resolve();
                }, 50
            )
        ));

        return mutex.runExclusive(() => assert(flag));
    });

    test('exceptions during runExclusive do not leave mutex locked', function() {
        let flag = false;

        mutex.runExclusive(() => {
            flag = true;
            throw new Error();
        }).then(() => undefined, () => undefined);

        return mutex.runExclusive(() => assert(flag));
    });

    test('new mutex is unlocked', function() {
        assert(!mutex.isLocked());
    });

    test('isLocked reflects the mutex state', async function() {
        const lock1 = mutex.acquire(),
            lock2 = mutex.acquire();

        assert(mutex.isLocked());

        const releaser1 = await lock1;

        assert(mutex.isLocked());

        releaser1();

        assert(mutex.isLocked());

        const releaser2 = await lock2;

        assert(mutex.isLocked());

        releaser2();

        assert(!mutex.isLocked());
    });

});

suite('Timeout Mutex', function() {
    /** @type {Mutex} */
    let mutex;
    const TIMEOUT = 200;
    
    setup(() => mutex = createMutex({timeout: TIMEOUT}));
    
    test('ownership is exclusive', function () {
        let flag = false;
        
        mutex
        .acquire()
        .then(release => setTimeout(() => {
            assert.ok(flag === false);
            flag = true;
            release();
        }, 20));
        
        return mutex.acquire()
        .then((release) => {
            release();
            
            assert(flag);
        });
    });
    
    test("rejects if blocked for a longer time", function() {
       mutex.acquire()
       .then(release => setTimeout(release, 2 * TIMEOUT));
       
       return assert.rejects(mutex.acquire, MutexTimeoutError);
    });
    
    test("rejects early and long waiting acquisitions, but fulfills later acquisitions", function() {
        let flag = false;
        
        console.log("[blocker");
        mutex.acquire()
        .then(release => new Promise(resolve => {
            console.log("..blocker");
            setTimeout(() => {
                flag = true;
                console.log("blocker.. done.");
                release();
                resolve();
            }, 2 * TIMEOUT);
        }))
        .finally(() => console.log("blocker]"));
        
        const
           earlyAcquisition =
            new Promise(resolve => setTimeout(resolve, 0.8 * TIMEOUT))
            .then(() => {
                assert.ok(mutex.isLocked());
                console.log("[early");
                return mutex.acquire();
            })
            .then(() => assert.ok(false, "this mutex should not have been acquired"))
           .finally(() => console.log("early]")),
        
            lateAcquisition =
               new Promise(resolve => setTimeout(resolve, 1.5 * TIMEOUT))
                .then(() => {
                    assert.ok(mutex.isLocked());
                    console.log("[late");
                    return mutex.acquire();
                })
                .then(releaseMutex => {
                    console.log("..late..");
                   assert.ok(flag);
                   flag = "3rd state";
                   return new Promise(resolve => setTimeout(resolve, 10))
                      .then(() => {
                          console.log("late..done.");
                          releaseMutex();
                      });
                })
                .finally(() => console.log("late]")),
           
           lastAcquisition =
              lateAcquisition
              .then(() => new Promise(resolve => setTimeout(resolve, 0.2 * TIMEOUT)))
                .then(() => {
                    console.log("[last");
                   assert.ok(mutex.isLocked() === false);
                   return mutex.acquire();
                })
                .then(release => {
                    console.log("..last..");
                    assert.ok(flag === "3rd state");
                    release();
                })
                .finally(() => console.log("last]"));
        
        return Promise.all([
           assert.rejects(earlyAcquisition, MutexTimeoutError),
           lateAcquisition,
           lastAcquisition
        ]);
    });
    
    test('runExclusive passes result (immediate)', function() {
        return mutex
            .runExclusive(() => 10)
            .then(value => assert.strictEqual(value, 10));
    });

    test('runExclusive passes result (promise)', function() {
        return mutex
            .runExclusive(() => new Promise(resolve => setTimeout(resolve, TIMEOUT + 50, 10)))
            .then(value => assert.strictEqual(value, 10));
    });
    
    test('runExclusive rejects on timeout', function() {
        const
           ten =
              mutex
              .runExclusive(() => new Promise(resolve => setTimeout(resolve, TIMEOUT + 50, 10)))
              .then(value => assert.strictEqual(value, 10)),
           
           never =
              mutex
              .runExclusive(() => 10)
                .then(() => assert.ok(false, "should be timed out and not be fulfilled"));
        
        return Promise.all([ten, assert.rejects(never, MutexTimeoutError)]);
    });

    test('runExclusive passes rejection', function() {
        return mutex
            .runExclusive(() => Promise.reject('foo'))
            .then(
                () => Promise.reject('should have been rejected'),
                value => assert.strictEqual(value, 'foo')
            );
    });

    test('runExclusive passes exception', function() {
        return mutex
            .runExclusive(() => {
                throw 'foo';
            })
            .then(
                () => Promise.reject('should have been rejected'),
                value => assert.strictEqual(value, 'foo')
            );
    });
    
    test('runExclusive is exclusive', function() {
        let flag = false;

        mutex
            .runExclusive(() => new Promise(
            resolve => setTimeout(
                () => {
                    flag = true;
                    resolve();
                }, 50
            )
        ));

        return mutex.runExclusive(() => assert(flag));
    });

    test('exceptions during runExclusive do not leave mutex locked', function() {
        let flag = false;

        mutex.runExclusive(() => {
            flag = true;
            throw new Error();
        }).then(() => undefined, () => undefined);

        return mutex.runExclusive(() => assert(flag));
    });

    test('new mutex is unlocked', function() {
        assert(!mutex.isLocked());
    });

    test('isLocked reflects the mutex state', async function() {
        const lock1 = mutex.acquire(),
            lock2 = mutex.acquire();

        assert(mutex.isLocked());

        const releaser1 = await lock1;

        assert(mutex.isLocked());

        releaser1();

        assert(mutex.isLocked());

        const releaser2 = await lock2;

        assert(mutex.isLocked());

        releaser2();

        assert(!mutex.isLocked());
    });
});
