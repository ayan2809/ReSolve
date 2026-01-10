"use strict";
var import_runServerless = require("../utils/runServerless");
describe("webhooks", () => {
  let cfTemplate;
  let computeLogicalId;
  beforeAll(async () => {
    ({ cfTemplate, computeLogicalId } = await (0, import_runServerless.runServerless)({
      fixture: "webhooks",
      configExt: import_runServerless.pluginConfigExt,
      command: "package"
    }));
  });
  test.each([
    ["secure", "CUSTOM"],
    ["insecure", "NONE"]
  ])("%p webhook should have authorization type %p", (useCase, expectedAuthorizationType) => {
    expect(cfTemplate.Resources[computeLogicalId(useCase, "Route")]).toMatchObject({
      Properties: {
        AuthorizationType: expectedAuthorizationType
      }
    });
  });
  test.each([
    ["post", "POST"],
    ["put", "PUT"],
    ["patch", "PATCH"]
  ])("%p webhook should have method %p", (useCase, expectedMethod) => {
    expect(cfTemplate.Resources[computeLogicalId(useCase, "Route")]["Properties"]).toMatchObject({
      RouteKey: expectedMethod + " /" + expectedMethod.toLowerCase()
    });
  });
  it("allows overriding webhook properties", () => {
    expect(cfTemplate.Resources[computeLogicalId("extendedWebhook", "Bus")].Properties).toMatchObject({
      Name: "myBus"
    });
    expect(cfTemplate.Resources[computeLogicalId("extendedWebhook", "HttpApi")].Properties).toMatchObject({
      FailOnWarnings: true
    });
  });
});
//# sourceMappingURL=webhooks.test.js.map
