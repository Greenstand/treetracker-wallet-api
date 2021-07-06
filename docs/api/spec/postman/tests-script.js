if(pm.request.url.getPath() === "/auth"){
  console.log("is auth, try to get token...");
  const responseJson = pm.response.json();
  console.log("response:", responseJson);
  if(responseJson.token){
    pm.environment.set("authToken", responseJson.token);
    console.log("has set env authToken");
  }else{
    console.warn("can not find the token");
  }
}
