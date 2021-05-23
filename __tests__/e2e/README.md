# Scope
The scope of this repository is to host all wallet API e2e tests.

#Requirements

```java 1.8```
```Node >12```
```Docker```

#Install for local execution
1. clone the repository
2. run ``npm install`` - install all dependencies

#Build docker images (locally)
``npm run build-docker`` - build the current project docker image (needed for docker parallel run)

####Test runners

```npm run docker``` - run all tests in parallel in docker
```npm run test``` - run tests locally with verbose option on


TODO:
* In package.json: remove NODE_TLS_REJECT_UNAUTHORIZED='0' and use valid ssl connection instead (not self signed)
* call seed.clear() function after all tests



