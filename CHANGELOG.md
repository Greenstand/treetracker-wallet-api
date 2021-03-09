## [1.10.3](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.10.2...v1.10.3) (2021-03-09)


### Bug Fixes

* fix link to capture data ([52dc427](https://github.com/Greenstand/treetracker-wallet-api/commit/52dc4270ced6b49a0002327edc6be9776e410124))
* require 12.x node version ([d784b6a](https://github.com/Greenstand/treetracker-wallet-api/commit/d784b6a3072695ef80a53102168ebd950daaeb90))

## [1.10.2](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.10.1...v1.10.2) (2021-03-09)


### Bug Fixes

* remove remove old remote logs env var from deployment ([da5bf61](https://github.com/Greenstand/treetracker-wallet-api/commit/da5bf61f2a6183fab503e90383f4ed0d14f5a997))

## [1.10.1](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.10.0...v1.10.1) (2021-03-04)


### Bug Fixes

* read schema from database connection secret for now ([008b2a2](https://github.com/Greenstand/treetracker-wallet-api/commit/008b2a23c0cb76f2e86f8a9ed4d4864f0fcd5c4b))

# [1.10.0](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.9.0...v1.10.0) (2021-03-04)


### Features

* add some unique constraints ([ba9aa65](https://github.com/Greenstand/treetracker-wallet-api/commit/ba9aa65fcad9cb3c1b3e2340a278c6e3fb776602))

# [1.9.0](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.8.0...v1.9.0) (2021-02-26)


### Bug Fixes

* bug in seed that is trying to insert 'type' column which has been deleted in the db schema ([5bd44ab](https://github.com/Greenstand/treetracker-wallet-api/commit/5bd44ab628e5ff563a610646593fb3c0c0a2c216))


### Features

* get back missing tests ([346161f](https://github.com/Greenstand/treetracker-wallet-api/commit/346161f0bbf31a1cab85c26efd02b2edad62e6be))
* refactor getTokenByTransferId to using join SQL ([ba53211](https://github.com/Greenstand/treetracker-wallet-api/commit/ba5321143badb4a32b09d679a8cdaddada229abc))
* replace cancelTransfer pendingTransfer with batch aproach ([6d12fa5](https://github.com/Greenstand/treetracker-wallet-api/commit/6d12fa5402286c50a2b8bafa1279939fc14746eb))
* replace completTransfer with batch way ([d08092d](https://github.com/Greenstand/treetracker-wallet-api/commit/d08092d38110b401ecca3faaf681f4eb42a935a0))

# [1.8.0](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.7.4...v1.8.0) (2021-02-20)


### Features

* use SERIALIZABLE transaction isolation level ([91b8f11](https://github.com/Greenstand/treetracker-wallet-api/commit/91b8f1148763019e7f297a3642f671f5cfd6f0fb))

## [1.7.4](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.7.3...v1.7.4) (2021-02-19)


### Bug Fixes

* delete pre-existing job ([fea4677](https://github.com/Greenstand/treetracker-wallet-api/commit/fea4677d9827e98a2a02db14072f49928ce9e815))

## [1.7.3](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.7.2...v1.7.3) (2021-02-19)


### Bug Fixes

* fix create demo wallet script ([3601917](https://github.com/Greenstand/treetracker-wallet-api/commit/360191767521fce7d9071aa6c666c5a88de1e7d7))

## [1.7.2](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.7.1...v1.7.2) (2021-02-18)


### Bug Fixes

* do not rely on latest tag, use kustomization ([a9afb84](https://github.com/Greenstand/treetracker-wallet-api/commit/a9afb84cbe2c3a17589c549ef294ab64ea0fd4b0))
* remove unnecessary migration ([f7916fc](https://github.com/Greenstand/treetracker-wallet-api/commit/f7916fc1cf582021588849483537c163006c7634))

## [1.7.1](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.7.0...v1.7.1) (2021-02-18)


### Bug Fixes

* clean up wallet table schema ([f329cdf](https://github.com/Greenstand/treetracker-wallet-api/commit/f329cdfbec4b8a47b89c06c51c7e55a629898607))
* try to get wait for job via kubectl working ([77c9077](https://github.com/Greenstand/treetracker-wallet-api/commit/77c907701f15ca46e0742b538d0dcc2223eb8315))

# [1.7.0](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.6.1...v1.7.0) (2021-02-18)


### Bug Fixes

* all tests passing ([612cf55](https://github.com/Greenstand/treetracker-wallet-api/commit/612cf555dc9e64539481377ff984b902bd544263))
* all unit tests passing ([a7555fb](https://github.com/Greenstand/treetracker-wallet-api/commit/a7555fb0278508b38190dcd2f9973a4f56b03c1c))
* all unit tests working ([59a9c99](https://github.com/Greenstand/treetracker-wallet-api/commit/59a9c99665915a22e2bcdb473bba9352b1804576))
* clean up debugging logs ([4c927d2](https://github.com/Greenstand/treetracker-wallet-api/commit/4c927d2a59155e5c39e221ac6ae25d4f4f437613))
* fix calls to test routines in package.json ([dd3b340](https://github.com/Greenstand/treetracker-wallet-api/commit/dd3b340ced6d21779d5d99d825c7f586eda11240))
* fix seed tests that did not use knex ([1895bcf](https://github.com/Greenstand/treetracker-wallet-api/commit/1895bcf15ed936b8bdeec7ea3c0c10fcb461f02a))
* fix some integration tests ([66cbe0e](https://github.com/Greenstand/treetracker-wallet-api/commit/66cbe0ea7baf0f1657d5569cbc94c4e28b5faa5d))
* fixes to code found by integration testing ([f80691e](https://github.com/Greenstand/treetracker-wallet-api/commit/f80691e64674be284e7eada52469384e9fb1b2a6))
* fixing integration tests and codes ([e4ae6e1](https://github.com/Greenstand/treetracker-wallet-api/commit/e4ae6e11d8f72ed4b9c634c257ce006727ebd992))
* remove old supertest file ([26d2168](https://github.com/Greenstand/treetracker-wallet-api/commit/26d21687b2b0f1708db37644f6e342dad987103f))
* remove unused and incorrectly configured database pool module ([b9094b5](https://github.com/Greenstand/treetracker-wallet-api/commit/b9094b5104300e6a5ab02e2bf92c24005d4cac40))
* remove unused import ([16b285c](https://github.com/Greenstand/treetracker-wallet-api/commit/16b285ce1a313ed03d84b3c0a5ebec7a00b644a4))
* set scheme for seed tests in ci ([2ffe6eb](https://github.com/Greenstand/treetracker-wallet-api/commit/2ffe6ebdf582b05f3be8a53dfc82a82099f934e4))
* set scheme for seed tests in ci ([fc80a05](https://github.com/Greenstand/treetracker-wallet-api/commit/fc80a0592bbe65e876647d767808fe7398b8255b))
* switch UUID for all ids, and set default value ([1249c91](https://github.com/Greenstand/treetracker-wallet-api/commit/1249c9198f4a2838dc0e30a704ed481e130e184e))
* switch UUID for all ids, and set default value ([ed8f27d](https://github.com/Greenstand/treetracker-wallet-api/commit/ed8f27d6bee88878d9897ddf8055e7a777a57ff7))
* use .spec.js for all integration test scopes ([7fa943f](https://github.com/Greenstand/treetracker-wallet-api/commit/7fa943fbae6b0bb5ffeb1d3445af7c0623908f40))
* use the ci env for unit tests in github actions ([1bb0b1b](https://github.com/Greenstand/treetracker-wallet-api/commit/1bb0b1b385ef495abae1a37a6cf4103c1c6367e7))
* wip - fix unit tests for uuid ids ([70edfe7](https://github.com/Greenstand/treetracker-wallet-api/commit/70edfe7a3748b8996d6ba95b02adff20781e0b14))
* wip refactor integration tests ([44d2f7c](https://github.com/Greenstand/treetracker-wallet-api/commit/44d2f7cf8d3b2391bf121725985082d246496b66))
* work in progress ([af99b9d](https://github.com/Greenstand/treetracker-wallet-api/commit/af99b9d3d366ea7423efa29a5d049a27e7e991f9))
* work in progress ([69935b6](https://github.com/Greenstand/treetracker-wallet-api/commit/69935b61725fd8c0c6292b4f1c05a5495b627c31))
* work to get integration working with primary key UUIDs, plus a log ([a234a0c](https://github.com/Greenstand/treetracker-wallet-api/commit/a234a0c17095fe14d7f11f5748aa79b4d26fa9a8))


### Features

* switch to UUID for all primary keys ([706581e](https://github.com/Greenstand/treetracker-wallet-api/commit/706581ec22f655bab177702f798b8cbfe67e8fee))
* switch to UUID for all primary keys ([5bd9606](https://github.com/Greenstand/treetracker-wallet-api/commit/5bd9606b3814571844d969702e142c3f62607260))
* use the webmap api for capture data ([9d4fbe6](https://github.com/Greenstand/treetracker-wallet-api/commit/9d4fbe6e3fde98212f45e805811d782ef6ec768c))
* use the webmap api for capture data ([d2cfc0a](https://github.com/Greenstand/treetracker-wallet-api/commit/d2cfc0ae66cfb0f6940b8407cd2cbd2833a44048))
* wip updating tests and models to uuid as id type, making tests more maintainable ([86babd5](https://github.com/Greenstand/treetracker-wallet-api/commit/86babd55cb62c1e693d9beaf08e00a789c6c854e))
* wip updating tests and models to uuid as id type, making tests more maintainable ([9ef0d0f](https://github.com/Greenstand/treetracker-wallet-api/commit/9ef0d0f0a9509f9775acc9fbfdd0269e9ae4e56f))

## [1.6.1](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.6.0...v1.6.1) (2021-02-11)


### Bug Fixes

* update db-migrate package ([b1514cb](https://github.com/Greenstand/treetracker-wallet-api/commit/b1514cb8c183535c46e9990570e975e5eaaa9e52))
* update pg package ([88486b3](https://github.com/Greenstand/treetracker-wallet-api/commit/88486b33c3e835121b2a389b6c9b2d20883eb6db))

# [1.6.0](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.5.0...v1.6.0) (2021-01-22)


### Bug Fixes

* add db-migrate in package.json back ([6ac5e6b](https://github.com/Greenstand/treetracker-wallet-api/commit/6ac5e6bdbb86f5dc7cf5006e9bbdc1afb612ea4d))
* broken int test ([8a8cc9e](https://github.com/Greenstand/treetracker-wallet-api/commit/8a8cc9ef83c2878ad598c54d8fe9a01ea627d53a))
* rerun npm install ([08634d7](https://github.com/Greenstand/treetracker-wallet-api/commit/08634d73417a3636b8d502202db19e25ae869ae7))
* update yaml for issue 100 ([38f6622](https://github.com/Greenstand/treetracker-wallet-api/commit/38f6622b5c78e14a3806be3e753430b4d5fb1092))


### Features

* 2nd commit for issue 100 ([22b6bb4](https://github.com/Greenstand/treetracker-wallet-api/commit/22b6bb4221f7f7b7ca96030ac4e52165b941e983))

# [1.5.0](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.4.1...v1.5.0) (2021-01-10)


### Bug Fixes

* clean up and gitignore edit ([4db5a39](https://github.com/Greenstand/treetracker-wallet-api/commit/4db5a396b85fcee476c8f8ada9a418291d3eeacb))
* properly set up environment variables for all tests ([410297a](https://github.com/Greenstand/treetracker-wallet-api/commit/410297a88784b743f0f94550b401505d6874da42))
* separate CI PR- flow tests ([8e9a64f](https://github.com/Greenstand/treetracker-wallet-api/commit/8e9a64f705481eb3463fd96330f3d019cff24bc0))
* update gitignore ([98f4dee](https://github.com/Greenstand/treetracker-wallet-api/commit/98f4dee661f97efeb7a7374c8d1097f9b6afa82b))
* update gitignore ([6b9a48f](https://github.com/Greenstand/treetracker-wallet-api/commit/6b9a48fad1ce70cea7023a0f5dd2694d778f44bf))


### Features

* update README ([abeaed7](https://github.com/Greenstand/treetracker-wallet-api/commit/abeaed743e9b4866f5cf3f84ab02655b2c0c029d))

## [1.4.1](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.4.0...v1.4.1) (2020-12-22)


### Bug Fixes

* unit test to remove uneccessary visit to the DB ([b6f71c3](https://github.com/Greenstand/treetracker-wallet-api/commit/b6f71c3ee912df61206bc6d6f9463e177f9f015c))

# [1.4.0](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.3.0...v1.4.0) (2020-12-16)


### Features

* add constraintion on circle management relationship ([c733ea8](https://github.com/Greenstand/treetracker-wallet-api/commit/c733ea8d7ee8f40c3570fcf6d64f59c892dbaa93))

# [1.3.0](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.2.5...v1.3.0) (2020-12-16)


### Bug Fixes

* wrong doing when get the token info on /transfer/tokens API ([ca89d4c](https://github.com/Greenstand/treetracker-wallet-api/commit/ca89d4c26f07edac907acff72007a0e63ba3ba45))
* yaml wrong typing ([5030d05](https://github.com/Greenstand/treetracker-wallet-api/commit/5030d056ae7b40bdeccc686a9db166026a6ba597))


### Features

* add GET /transer_id & GET /transfer_id/tokens ([ab8aaf6](https://github.com/Greenstand/treetracker-wallet-api/commit/ab8aaf61de85e17bb2ce1baa83b534d5f49a9f9f))
* tokens list support 'start' parameter ([a46f50d](https://github.com/Greenstand/treetracker-wallet-api/commit/a46f50d22e2976224c243d85e892995f1f4dc4e1))

## [1.2.5](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.2.4...v1.2.5) (2020-12-15)


### Bug Fixes

* add locations to fake trees ([70d5ef9](https://github.com/Greenstand/treetracker-wallet-api/commit/70d5ef90a6e9fb0478baa15967f0580e80abc17b))

## [1.2.4](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.2.3...v1.2.4) (2020-12-15)


### Bug Fixes

* no need to use secret for db schema name ([bfca513](https://github.com/Greenstand/treetracker-wallet-api/commit/bfca513f0cec66c6583f5c6ca3eaf98eb8a0914d))

## [1.2.3](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.2.2...v1.2.3) (2020-12-15)


### Bug Fixes

* coding mistake ([bdb2490](https://github.com/Greenstand/treetracker-wallet-api/commit/bdb24901d7fcf2309d038837a28ae84c870565ed))

## [1.2.2](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.2.1...v1.2.2) (2020-12-15)


### Bug Fixes

* debug wallet search path ([a7c4cf6](https://github.com/Greenstand/treetracker-wallet-api/commit/a7c4cf61e9ac3635ed4fd1f02e841e8d3cc09a95))

## [1.2.1](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.2.0...v1.2.1) (2020-12-15)


### Bug Fixes

* add debug message about schema ([6413131](https://github.com/Greenstand/treetracker-wallet-api/commit/6413131d77b2096b975e772db4bcd2ca29ff11c7))
* remove root path debug messages ([d5e45c3](https://github.com/Greenstand/treetracker-wallet-api/commit/d5e45c38a7c7b2aa568f1a0cacec4c1e20fad063))

# [1.2.0](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.20...v1.2.0) (2020-12-15)


### Bug Fixes

* add catch all remote log endpoint ([2cce047](https://github.com/Greenstand/treetracker-wallet-api/commit/2cce047b4929485ccd261d7ac47903a33c0bfdb1))
* include debugging for missing schema env ([713ea9e](https://github.com/Greenstand/treetracker-wallet-api/commit/713ea9ea69768818f97707a619976dbeec0b76d9))
* trigger CI ([fc2e36e](https://github.com/Greenstand/treetracker-wallet-api/commit/fc2e36e2e321a0aff3073ea43ac34957defb1ddc))


### Features

* added check for duplicate trust request ([e36d226](https://github.com/Greenstand/treetracker-wallet-api/commit/e36d2263ada51590b72a1df2aa0f82ad6448dc3d))

## [1.1.20](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.19...v1.1.20) (2020-12-11)


### Bug Fixes

* show version at root path ([b7bba85](https://github.com/Greenstand/treetracker-wallet-api/commit/b7bba85abbd7ae3b991b458e2971bdf6756c7431))

## [1.1.19](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.18...v1.1.19) (2020-12-11)


### Bug Fixes

* set search path correctly for knex ([853c23e](https://github.com/Greenstand/treetracker-wallet-api/commit/853c23e6e58b9850155a124a88e6be4000cd45a6))

## [1.1.18](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.17...v1.1.18) (2020-12-11)


### Bug Fixes

* found another place where search_path was set ([31f11fe](https://github.com/Greenstand/treetracker-wallet-api/commit/31f11fee2d896bc35193c024152c8bc03e9e98a9))

## [1.1.17](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.16...v1.1.17) (2020-12-11)


### Bug Fixes

* fix reference to dispatch tag ([29d34d6](https://github.com/Greenstand/treetracker-wallet-api/commit/29d34d69a0987a2bc75c89e4a9a40647a7d545d2))

## [1.1.16](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.15...v1.1.16) (2020-12-11)


### Bug Fixes

* dont skip ([b7c244b](https://github.com/Greenstand/treetracker-wallet-api/commit/b7c244bf63f2bac119b1d311f24c80c9ad8b0953))

## [1.1.15](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.14...v1.1.15) (2020-12-11)


### Bug Fixes

* remove sha from tag name ([e9fc33a](https://github.com/Greenstand/treetracker-wallet-api/commit/e9fc33a3d93360c9d01a755c6e6227462e94d076))

## [1.1.14](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.13...v1.1.14) (2020-12-11)


### Bug Fixes

* remove dependency from dispatch job ([803d90d](https://github.com/Greenstand/treetracker-wallet-api/commit/803d90d90796a378fb8fe81af8fc27955179cf3b))

## [1.1.13](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.12...v1.1.13) (2020-12-11)


### Bug Fixes

* bug on counting token in wallets ([3a7a3c8](https://github.com/Greenstand/treetracker-wallet-api/commit/3a7a3c82b3eab8e97832ff876690eb6bc8fb883e))
* skiped tests ([ec8ac55](https://github.com/Greenstand/treetracker-wallet-api/commit/ec8ac550bb223fd623de2f76b91a7c56c051848b))

## [1.1.12](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.11...v1.1.12) (2020-12-11)


### Bug Fixes

* dont use sha in image tag, and create first pass at manual dispatch event to deploy to test env ([7f30eb5](https://github.com/Greenstand/treetracker-wallet-api/commit/7f30eb54b3001a65b255c5b8c34190491b8af07f))

## [1.1.11](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.10...v1.1.11) (2020-12-10)


### Bug Fixes

* trigger build ([d44df59](https://github.com/Greenstand/treetracker-wallet-api/commit/d44df59c7b54c691ea3d72c27787c2857db18616))

## [1.1.10](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.9...v1.1.10) (2020-12-10)


### Bug Fixes

* store image tag name in artifact between jobs ([2168464](https://github.com/Greenstand/treetracker-wallet-api/commit/21684642205f57592841b5d1de4e3cd8ffca35bb))

## [1.1.9](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.8...v1.1.9) (2020-12-10)


### Bug Fixes

* remove separate release job ([0a3a568](https://github.com/Greenstand/treetracker-wallet-api/commit/0a3a5681240e9b9ee7076fad0a35683366d084b2))

## [1.1.8](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.7...v1.1.8) (2020-12-10)


### Bug Fixes

* release and build so we have the right release tag on the docker image ([d3c9a15](https://github.com/Greenstand/treetracker-wallet-api/commit/d3c9a154de766f9276a6c0d54e288a2b62a4fc91))
* set up schema env var ([5af5cde](https://github.com/Greenstand/treetracker-wallet-api/commit/5af5cde813573d9fb8243178f377daf6cf0a1c10))

## [1.1.7](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.6...v1.1.7) (2020-12-10)


### Bug Fixes

* use environment variable to specify schema ([8673862](https://github.com/Greenstand/treetracker-wallet-api/commit/8673862b3a2d4418e5527506bfdbab19413f749c))

## [1.1.6](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.5...v1.1.6) (2020-12-10)


### Bug Fixes

* include all resources in kustomization ([0404bd3](https://github.com/Greenstand/treetracker-wallet-api/commit/0404bd3e15feec7f7f4d84e65a44c781fbc5d422))

## [1.1.5](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.4...v1.1.5) (2020-12-10)


### Bug Fixes

* attempt to fix contains syntax ([f6a0b73](https://github.com/Greenstand/treetracker-wallet-api/commit/f6a0b73b4268066681c74bda6dd345d1a498994f))
* enable push to skip ci ([825b53b](https://github.com/Greenstand/treetracker-wallet-api/commit/825b53bb7a6e5b99f248d99ef8b7831d8519b434))

## [1.1.4](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.3...v1.1.4) (2020-12-09)


### Bug Fixes

* change order of semver plugins ([acc00d3](https://github.com/Greenstand/treetracker-wallet-api/commit/acc00d390e2b2da8bf66a7904d5ad9e6ff7cd2e3))
* do not include release notes - makes commit message too long ([ba8b705](https://github.com/Greenstand/treetracker-wallet-api/commit/ba8b705088ab19ff337f669b433e2064e2f884fd))

## [1.1.2](https://github.com/Greenstand/treetracker-wallet-api/compare/v1.1.1...v1.1.2) (2020-12-09)


### Bug Fixes

* edit package.json ([503faf8](https://github.com/Greenstand/treetracker-wallet-api/commit/503faf860f49e1856dabadff0b0e243b64a7c2c6))
* fix tag name ([6b5a478](https://github.com/Greenstand/treetracker-wallet-api/commit/6b5a47836a16ebe528a06d7b4d3af26f5374fd86))

# 1.0.0 (2020-12-09)


### Bug Fixes

* set up hooks ([21580a5](https://github.com/Greenstand/treetracker-wallet-api/commit/21580a5f801ce72cb030bebbfcfba3532e3d485d))
