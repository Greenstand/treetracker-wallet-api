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

##Troubleshooting

1. Failures in *Before* and *After* steps indicate problem with DB connection, 
   please check if the details in *.env* file are correctly setup.
```
Creating test data in DB...
clearing db
  1) "before all" hook: beforeAll in "{root}"
Clearing test data from DB!
clearing db
  2) "after all" hook: afterAll in "{root}"

  0 passing (15ms)
  2 failing

  1) "before all" hook: beforeAll in "{root}":
     Error: The server does not support SSL connections
      at Socket.<anonymous> (node_modules/pg/lib/connection.js:72:37)
      ...

  2) "after all" hook: afterAll in "{root}":
     Error: The server does not support SSL connections
      at Socket.<anonymous> (node_modules/pg/lib/connection.js:72:37)
      ...
```


