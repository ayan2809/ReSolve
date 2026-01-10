"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var cloudfrontFunctions_exports = {};
__export(cloudfrontFunctions_exports, {
  redirectToMainDomain: () => redirectToMainDomain
});
module.exports = __toCommonJS(cloudfrontFunctions_exports);
function redirectToMainDomain(domains) {
  if (domains === void 0 || domains.length < 2) {
    return "";
  }
  const mainDomain = domains[0];
  return `
    if (request.headers["host"].value !== "${mainDomain}") {
        return {
            statusCode: 301,
            statusDescription: "Moved Permanently",
            headers: {
                location: {
                    value: "https://${mainDomain}" + request.uri
                }
            }
        };
    }`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  redirectToMainDomain
});
//# sourceMappingURL=cloudfrontFunctions.js.map
