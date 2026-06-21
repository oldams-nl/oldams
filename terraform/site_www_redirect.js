// CloudFront Function (viewer-request): 301 www.oldams.nl -> apex oldams.nl,
// preserving path and query string. Runs at the edge for every request.
function handler(event) {
  var request = event.request;
  var host = request.headers.host && request.headers.host.value;
  if (host && host.indexOf("www.") === 0) {
    var apex = host.slice(4);
    var qs = "";
    if (request.querystring) {
      var parts = [];
      for (var k in request.querystring) {
        var v = request.querystring[k];
        parts.push(v.value ? k + "=" + v.value : k);
      }
      if (parts.length) qs = "?" + parts.join("&");
    }
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: "https://" + apex + request.uri + qs } },
    };
  }
  return request;
}
