const fs = require('fs');
const path = require('path');
const testCountFile = path.join(__dirname, 'testCount.json');

let currentTestIndex = 0;
let totalTests = 0;

exports.config = {
    onPrepare: function () {
        // Initialize or reset the test count
        if (fs.existsSync(testCountFile)) {
            fs.unlinkSync(testCountFile); // Clear previous runs
        }
        fs.writeFileSync(testCountFile, JSON.stringify({ total: 0, executed: 0, retries: 0, skipped: 0 }));
    },

    onWorkerStart: function (cid, caps, specs, args, execArgv) {
        // Count specs for each worker and log
        console.log(`Worker ${cid} started with specs: ${specs}`);
        if (specs.length > 0) {
            const data = JSON.parse(fs.readFileSync(testCountFile));
            data.total += specs.length; // Increment total specs
            fs.writeFileSync(testCountFile, JSON.stringify(data));
        }
    },

    beforeEach: () => {
        currentTestIndex++;
    },

    afterEach: async function () {
        const data = JSON.parse(fs.readFileSync(testCountFile));

        try {

            // Track retries and skipped tests
            if (this.currentTest._currentRetry > 0) {
                data.retries++;
            }
            if (this.currentTest.state === 'pending') {
                data.skipped++;
            } else {
                data.executed++;
            }
            fs.writeFileSync(testCountFile, JSON.stringify(data));

        } catch (error) {
            console.error("Error updating test metadata or count:", error);
        }

        if (currentTestIndex < totalTests) {
            console.log(`Reloading session after test ${currentTestIndex}`);
            await browser.reloadSession();
        } else {
            console.log(`Quitting session after test ${currentTestIndex}`);
            await browser.deleteSession();
        }
    },

    onComplete: function () {
        const data = JSON.parse(fs.readFileSync(testCountFile));
        console.log(`Test Run Summary:
            Total Tests: ${data.total}
            Executed Tests: ${data.executed}
            Retries: ${data.retries}
            Skipped Tests: ${data.skipped}`);
        fs.unlinkSync(testCountFile); // Clean up after run
    },

    services: [
        [
            "lambdatest",
            {
                tunnel: false,
                lambdatestOpts: {
                    logFile: "tunnel.log"
                }
            }
        ]
    ],

    user: process.env.LT_USERNAME,
    key: process.env.LT_ACCESS_KEY,
    buildName: process.env.LT_BUILD_NAME,
    specs: ["../tests/specs/single_test.js"],
    exclude: [],

    capabilities: [
        {
            "LT:Options": {
                browserName: "chrome",
                version: "latest",
                build: "WebDriver Selenium Sample"
            }
        }
    ],
    logLevel: "info",
    coloredLogs: true,
    screenshotPath: "./errorShots/",
    waitforTimeout: 100000,
    connectionRetryTimeout: 90000,
    connectionRetryCount: 1,
    path: "/wd/hub",
    hostname: "hub.lambdatest.com",
    port: 80,
    framework: "mocha",
    mochaOpts: {
        ui: "bdd",
        timeout: 50000
    }
};
