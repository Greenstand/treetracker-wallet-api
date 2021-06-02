#Requirements

```java 1.8```
```Node >12```

#Install for local execution
1. clone the repository
2. run ``npm install`` - install all dependencies
3. create ``.env`` file with proper database connection, for example:

```
ENVIRONMENT=dev #specify environment where to run the tests against (dev/test)
DB_USERNAME=admin
DB_HOST=host.com
DB_PASSWORD=password
DB_NAME=database_name
DB_PORT=12345
DB_SCHEMA=schema
```

####Test runner

```npm run test-e2e``` - run tests




