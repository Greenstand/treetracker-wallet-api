#API Documentation (earlier API version)

https://documenter.getpostman.com/view/10112806/SWTD8H5x?version=latest

To view the specs for the new API we are currently building, go to https://editor.swagger.io and load the YAML file from /docs/api/spec/treetracker-token-api.yaml

# Video Tutorial
* https://youtu.be/6WjlMb_UG5o    Greenstand - API via Postman Tutorial Video

* https://youtu.be/hRv5mcxlWX8    Greenstand -  Tokens Transfer  Tutorial Video

* https://youtu.be/H6levADLJ4E    Greenstand - Permission Access Tutorial Video

# Getting Started

## Project Setup

Open terminal and navigate to a folder to install this project:

```
git clone https://github.com/Greenstand/treetracker-token-trading-api.git

```
Install all necessary dependencies: 

```
npm install

```
While running the server locally, generate your own public and private JWT keys in your config folder using the keygen script below:

```
ssh-keygen -t rsa -b 4096 -m PEM -f jwtRS256.key
# Don't add passphrase
openssl rsa -in jwtRS256.key -pubout -outform PEM -out jwtRS256.key.pub
cat jwtRS256.key
cat jwtRS256.key.pub
```

### Database Setup

We recommend setting up your Postgres server/database locally and exporting your connection string in ./config/config.js as such:

```
exports.connectionString = "postgresql://[your_username]@localhost:5432/[database_name]";

```
After setting up your local database, contact us in the development slack channel for the credentials for our dev database. You can then copy over the public schema from the dev database into your own local db. 

Here are some resources to get started on local database set up and migration:
* https://postgresapp.com
* pgAdmin and DBeaver are great GUI options to use for navigating your local db 
* https://www.postgresql.org/docs/9.1/app-pgdump.html

Next, create a new wallets schema in your local database. Navigate to the database folder and create a database.json file populated with the credentials for your local server:

```
{
  "dev": {
    "driver": "pg",
    "user" : "[your_username]",
    "password" : "[your_pw]",
    "database" : "[your_dbname]",
    "host" : "localhost",
    "port" : "5432",
    "schema" : "wallets"
  }
}
```
To quickly build the necessary tables for your wallets schema, run:

```
db-migrate --env dev up
```

If you have not installed db-migrate globally, you can run:

```
../node_modules/db-migrate/bin/db-migrate --env dev up
```

See here to learn more about db-migrate: https://db-migrate.readthedocs.io/en/latest/

Now you should be all set up and ready to go!

# How to test

## Unit test

To run the unit tests:

```
npm run test-unit
```

## Integration test

All the integration tests are located under folder `__tests__`

To run the integration test:

First, start the server:

```
npm run server
```

Run tests:

```
npm run test-integration
```

## Database seeding test
In order to efficiently run our integration tests, we rely on automated database seeding/clearing functions to mock database entries. To test these functions, run:

```
npm run test-seedDB
```
