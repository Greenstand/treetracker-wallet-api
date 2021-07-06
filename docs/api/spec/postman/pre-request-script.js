//set the auth token
pm.request.headers.upsert({
  key: "Authorization",
  value: 'Bearer ' + pm.environment.get('authToken')
});

//for the request to use json body
pm.request.headers.upsert({
  key: "Content-Type",
  value: "application/json"
});
