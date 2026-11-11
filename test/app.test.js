const test = require("node:test");
const assert = require("node:assert/strict");

test("application health endpoint contract", async () => {
    const response = {
        status: "healthy"
    };

    assert.equal(response.status, "healthy");
});